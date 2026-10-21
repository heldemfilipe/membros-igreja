import type { Pool, PoolClient } from 'pg'
import { z } from 'zod'
import { ApiError, temPermissao } from './api'
import type { AuthUser } from './auth'
import { JANELA_EDICAO_DIAS, TIPOS_OFERTA, type TipoOferta } from './ofertas-shared'

export * from './ofertas-shared'

type DB = Pool | PoolClient

/**
 * Ofertas são dado sensível: as permissões NÃO valem pela retrocompat
 * "usuário sem perfil = acesso total" — só admin ou quem tem a flag marcada.
 */
const flag = (u: AuthUser, k: string) => u.tipo === 'admin' || u.permissoes[k] === true

export const podeLancar = (u: AuthUser) => flag(u, 'ofertas_lancar')
export const podeVerOfertas = (u: AuthUser) => flag(u, 'ofertas_ver')
export const podeEditarQualquer = (u: AuthUser) => flag(u, 'ofertas_editar')
export const podeVerDetalhe = (u: AuthUser) => flag(u, 'ofertas_detalhe_ver')
export const podeAcessarOfertas = (u: AuthUser) => podeLancar(u) || podeVerOfertas(u) || podeEditarQualquer(u)
/** Lista de pendentes: quem lança/vê ofertas ou quem cuida de cadastros. */
export const podeVerPendentes = (u: AuthUser) => podeAcessarOfertas(u) || temPermissao(u, 'membros_editar')

/** Quem lançou corrige dentro da janela; depois disso, só com `ofertas_editar`. */
export function podeEditarOferta(u: AuthUser, oferta: { lancado_por: number | null; created_at: string | Date }): boolean {
  if (podeEditarQualquer(u)) return true
  if (!podeLancar(u) || oferta.lancado_por !== u.id) return false
  const idadeMs = Date.now() - new Date(oferta.created_at).getTime()
  return idadeMs <= JANELA_EDICAO_DIAS * 86_400_000
}

// ─── Validação do corpo ──────────────────────────────────────────────────────

const centavos = z.number().int().min(0).max(99_999_999_99)

const itemSchema = z.object({
  tipo: z.enum(TIPOS_OFERTA.map(t => t.key) as [TipoOferta, ...TipoOferta[]]),
  valor: z.number().int().positive('Valor do detalhe deve ser maior que zero.').max(99_999_999_99),
  membro_id: z.number().int().positive().nullable().optional(),
  pessoa_pendente_id: z.number().int().positive().nullable().optional(),
  nova_pessoa: z.object({
    nome: z.string().trim().min(1, 'Informe o nome da pessoa não cadastrada.').max(120),
    telefone: z.string().trim().max(30).nullable().optional(),
  }).nullable().optional(),
})

export const ofertaSchema = z.object({
  congregacao_id: z.number({ required_error: 'Informe a congregação.' }).int().positive(),
  data_culto: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data do culto inválida.'),
  culto_id: z.number().int().positive().nullable().optional(),
  culto_nome: z.string().trim().max(80).nullable().optional(),
  valores: z.object({ dizimos: centavos, ofertas: centavos, missoes: centavos, outros: centavos }),
  observacoes: z.string().trim().max(500).nullable().optional(),
  itens: z.array(itemSchema).max(300, 'No máximo 300 linhas de detalhe.').default([]),
}).superRefine((d, ctx) => {
  const total = TIPOS_OFERTA.reduce((s, t) => s + d.valores[t.key], 0)
  if (total <= 0) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Informe ao menos um valor.' })

  d.itens.forEach((it, i) => {
    const fontes = [it.membro_id, it.pessoa_pendente_id, it.nova_pessoa].filter(v => v != null).length
    if (fontes !== 1) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Detalhe ${i + 1}: escolha uma pessoa.` })
    }
  })

  for (const t of TIPOS_OFERTA) {
    const detalhado = d.itens.filter(it => it.tipo === t.key).reduce((s, it) => s + it.valor, 0)
    if (detalhado > d.valores[t.key]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `${t.label}: o detalhe por pessoa passa do total informado.`,
      })
    }
  }
})

// `itens` tem default no schema; parseBody devolve o tipo de entrada (opcional).
export type OfertaPayload = Omit<z.infer<typeof ofertaSchema>, 'itens'> & {
  itens?: z.infer<typeof ofertaSchema>['itens']
}

const reais = (c: number) => (c / 100).toFixed(2)

// ─── Gravação ────────────────────────────────────────────────────────────────

/** Estado completo de uma oferta (para auditoria e para a tela de edição). */
export async function lerOferta(db: DB, id: number) {
  const { rows } = await db.query(
    `SELECT o.*, c.nome AS congregacao_nome, u.nome AS lancado_por_nome, ua.nome AS atualizado_por_nome
     FROM ofertas o
     JOIN congregacoes c ON c.id = o.congregacao_id
     LEFT JOIN usuarios u ON u.id = o.lancado_por
     LEFT JOIN usuarios ua ON ua.id = o.atualizado_por
     WHERE o.id = $1`,
    [id],
  )
  if (rows.length === 0) return null
  const itens = await db.query(
    `SELECT id, tipo, valor, membro_id, pessoa_pendente_id, nome
     FROM oferta_itens WHERE oferta_id = $1 ORDER BY id`,
    [id],
  )
  return { ...rows[0], itens: itens.rows }
}

export async function registrarAuditoria(
  db: DB,
  user: AuthUser,
  ofertaId: number,
  acao: 'criar' | 'editar' | 'excluir',
  antes: unknown,
  depois: unknown,
) {
  await db.query(
    `INSERT INTO ofertas_auditoria (oferta_id, acao, usuario_id, usuario_nome, antes, depois)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [ofertaId, acao, user.id, user.nome, antes == null ? null : JSON.stringify(antes), depois == null ? null : JSON.stringify(depois)],
  )
}

/**
 * Cria (id = null) ou atualiza uma oferta com seus itens, dentro da transação
 * do `client`. Valida culto, membros e pendentes contra a congregação e cria as
 * pessoas novas na lista de pendentes. Devolve o id.
 */
export async function salvarOferta(
  client: PoolClient,
  user: AuthUser,
  id: number | null,
  body: OfertaPayload,
): Promise<number> {
  const { rows: congRows } = await client.query('SELECT nome FROM congregacoes WHERE id = $1', [body.congregacao_id])
  if (congRows.length === 0) throw new ApiError(404, 'Congregação não encontrada.')
  const congNome: string = congRows[0].nome

  const hoje = new Date()
  hoje.setDate(hoje.getDate() + 1) // tolera fuso: o culto de "hoje" nunca é rejeitado
  if (body.data_culto > hoje.toISOString().slice(0, 10)) {
    throw new ApiError(400, 'A data do culto não pode ser no futuro.')
  }

  let cultoId: number | null = null
  let cultoNome = body.culto_nome?.trim() || ''
  if (body.culto_id) {
    const { rows } = await client.query(
      'SELECT nome FROM cultos WHERE id = $1 AND congregacao_id = $2',
      [body.culto_id, body.congregacao_id],
    )
    if (rows.length === 0) throw new ApiError(400, 'Culto não pertence a esta congregação.')
    cultoId = body.culto_id
    cultoNome = rows[0].nome
  }
  if (!cultoNome) throw new ApiError(400, 'Informe o culto.')

  const v = body.valores
  const obs = body.observacoes?.trim() || null
  try {
    if (id == null) {
      const { rows } = await client.query(
        `INSERT INTO ofertas (congregacao_id, data_culto, culto_id, culto_nome, dizimos, ofertas, missoes, outros,
                              observacoes, lancado_por, atualizado_por)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING id`,
        [body.congregacao_id, body.data_culto, cultoId, cultoNome,
         reais(v.dizimos), reais(v.ofertas), reais(v.missoes), reais(v.outros), obs, user.id],
      )
      id = rows[0].id as number
    } else {
      await client.query(
        `UPDATE ofertas SET congregacao_id=$2, data_culto=$3, culto_id=$4, culto_nome=$5,
           dizimos=$6, ofertas=$7, missoes=$8, outros=$9, observacoes=$10,
           atualizado_por=$11, updated_at=NOW()
         WHERE id=$1`,
        [id, body.congregacao_id, body.data_culto, cultoId, cultoNome,
         reais(v.dizimos), reais(v.ofertas), reais(v.missoes), reais(v.outros), obs, user.id],
      )
      await client.query('DELETE FROM oferta_itens WHERE oferta_id = $1', [id])
    }
  } catch (e) {
    if ((e as { code?: string }).code === '23505') {
      throw new ApiError(409, `Já existe lançamento do culto "${cultoNome}" nesta data. Abra o lançamento existente para corrigir.`)
    }
    throw e
  }

  for (const it of body.itens ?? []) {
    let membroId: number | null = null
    let pendenteId: number | null = null
    let nome: string

    if (it.membro_id) {
      const { rows } = await client.query(
        'SELECT nome FROM membros WHERE id = $1 AND igreja = $2',
        [it.membro_id, congNome],
      )
      if (rows.length === 0) throw new ApiError(400, 'Uma das pessoas do detalhe não é desta congregação.')
      membroId = it.membro_id
      nome = rows[0].nome
    } else if (it.pessoa_pendente_id) {
      const { rows } = await client.query(
        'SELECT nome, membro_id FROM pessoas_pendentes WHERE id = $1 AND congregacao_id = $2',
        [it.pessoa_pendente_id, body.congregacao_id],
      )
      if (rows.length === 0) throw new ApiError(400, 'Uma das pessoas pendentes não é desta congregação.')
      pendenteId = it.pessoa_pendente_id
      membroId = rows[0].membro_id ?? null // já foi cadastrada: liga direto ao membro
      nome = rows[0].nome
    } else {
      const np = it.nova_pessoa!
      nome = np.nome.trim()
      // Reaproveita a mesma pessoa pendente (mesmo nome) em vez de duplicar.
      const existente = await client.query(
        `SELECT id FROM pessoas_pendentes
         WHERE congregacao_id = $1 AND status = 'pendente' AND lower(nome) = lower($2) LIMIT 1`,
        [body.congregacao_id, nome],
      )
      if (existente.rows.length) {
        pendenteId = existente.rows[0].id
        if (np.telefone?.trim()) {
          await client.query(
            `UPDATE pessoas_pendentes SET telefone = COALESCE(telefone, $2) WHERE id = $1`,
            [pendenteId, np.telefone.trim()],
          )
        }
      } else {
        const { rows } = await client.query(
          `INSERT INTO pessoas_pendentes (congregacao_id, nome, telefone, criado_por)
           VALUES ($1,$2,$3,$4) RETURNING id`,
          [body.congregacao_id, nome, np.telefone?.trim() || null, user.id],
        )
        pendenteId = rows[0].id
      }
    }

    await client.query(
      `INSERT INTO oferta_itens (oferta_id, tipo, valor, membro_id, pessoa_pendente_id, nome)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [id, it.tipo, reais(it.valor), membroId, pendenteId, nome],
    )
  }

  return id
}
