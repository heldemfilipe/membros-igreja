import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, ApiError } from '@/lib/api'
import { assertCongregacaoNoEscopoDb, congregacoesEfetivas } from '@/lib/scope'
import { addDias, diasDoIntervalo, diasMMDD, hojeISO, isISO, segundaFeira } from '@/lib/semana'
import type { PautaAutomatico, PautaSemana, PautaTipo } from '@/types'

const TIPOS: PautaTipo[] = ['aniversario', 'bodas', 'oracao', 'aviso']

/**
 * Descobre de qual congregação é a pauta. Sempre precisa de uma: a pauta é
 * o que o dirigente daquela congregação vai ler no culto. Se o usuário só
 * tem acesso a uma, nem precisa informar.
 */
async function resolverCongregacao(
  user: Parameters<typeof assertCongregacaoNoEscopoDb>[0],
  bruto: string | null,
): Promise<number> {
  let congId = bruto ? Number(bruto) : NaN
  if (!Number.isFinite(congId)) {
    const efetivas = await congregacoesEfetivas(user, pool)
    if (efetivas?.length === 1) congId = efetivas[0]
    else throw new ApiError(400, 'Informe a congregação da pauta.')
  }
  await assertCongregacaoNoEscopoDb(user, congId, pool)
  return congId
}

/**
 * GET /api/pauta?congregacao=N&semana=YYYY-MM-DD
 *
 * Devolve a pauta de UMA semana: os aniversários/bodas que o sistema já
 * conhece (calculados na hora, nunca copiados) + o que a recepção digitou.
 *
 * Os aniversários mostrados são só os DENTRO da semana escolhida (a mesma
 * que aparece no cabeçalho, ex.: "7 a 13 de setembro") — nada de semana
 * anterior misturado na lista.
 */
export const GET = withAuth(async (req: NextRequest, user) => {
  const { searchParams } = new URL(req.url)
  const congId = await resolverCongregacao(user, searchParams.get('congregacao'))

  const semanaParam = searchParams.get('semana')
  const semanaInicio = segundaFeira(isISO(semanaParam) ? semanaParam : hojeISO())
  const semanaFim = addDias(semanaInicio, 6)

  const cong = await pool.query('SELECT id, nome FROM congregacoes WHERE id = $1', [congId])
  if (cong.rows.length === 0) throw new ApiError(404, 'Congregação não encontrada.')
  const congNome: string = cong.rows[0].nome

  // 'MM-DD' de cada dia da semana: compara a data do aniversário sem o ano.
  const dias = diasMMDD(semanaInicio, semanaFim)
  const mapaDias = new Map<string, string>()
  for (const d of diasDoIntervalo(semanaInicio, semanaFim)) mapaDias.set(d.slice(5), d)
  // Quem nasceu em 29/02 é parabenizado no dia 28 nos anos não-bissextos.
  if (!mapaDias.has('02-29') && mapaDias.has('02-28')) mapaDias.set('02-29', mapaDias.get('02-28')!)

  const [nascimentos, casamentos, marcacoes, itens] = await Promise.all([
    pool.query(
      `SELECT id, nome, telefone_principal, data_nascimento::text AS data
         FROM membros
        WHERE ativo = TRUE
          AND igreja = $1
          AND data_nascimento IS NOT NULL
          AND to_char(data_nascimento, 'MM-DD') = ANY($2::text[])
        ORDER BY nome`,
      [congNome, dias],
    ),
    pool.query(
      `WITH casais AS (
         SELECT m.id, m.nome, m.telefone_principal,
                COALESCE(m.data_casamento, mc.data_casamento) AS data_casamento,
                mc.id   AS conjuge_id,
                mc.nome AS conjuge_nome
           FROM membros m
           LEFT JOIN familiares f
             ON f.membro_id = m.id
            AND f.parentesco = 'Cônjuge'
            AND f.membro_vinculado_id IS NOT NULL
           LEFT JOIN membros mc ON mc.id = f.membro_vinculado_id
          WHERE m.ativo = TRUE AND m.igreja = $1
       )
       SELECT DISTINCT ON (LEAST(id, COALESCE(conjuge_id, id)))
              id, nome, telefone_principal, conjuge_nome,
              data_casamento::text AS data
         FROM casais
        WHERE data_casamento IS NOT NULL
          AND to_char(data_casamento, 'MM-DD') = ANY($2::text[])
        ORDER BY LEAST(id, COALESCE(conjuge_id, id))`,
      [congNome, dias],
    ),
    pool.query(
      'SELECT chave, concluido FROM pauta_marcacoes WHERE congregacao_id = $1 AND semana_inicio = $2',
      [congId, semanaInicio],
    ),
    pool.query(
      `SELECT p.id, p.congregacao_id, p.semana_inicio::text AS semana_inicio, p.tipo,
              p.titulo, p.descricao, p.data_referencia::text AS data_referencia,
              p.telefone, p.concluido, p.concluido_em, p.adiado_de::text AS adiado_de,
              u.nome AS criado_por_nome, p.created_at
         FROM pauta_itens p
         LEFT JOIN usuarios u ON u.id = p.criado_por
        WHERE p.congregacao_id = $1 AND p.semana_inicio = $2
        ORDER BY p.concluido, p.data_referencia NULLS LAST, p.id`,
      [congId, semanaInicio],
    ),
  ])

  const feitas = new Map<string, boolean>(marcacoes.rows.map(r => [r.chave as string, !!r.concluido]))

  const montar = (
    tipo: 'aniversario' | 'bodas',
    row: { id: number; nome: string; telefone_principal: string | null; data: string; conjuge_nome?: string | null },
  ): PautaAutomatico | null => {
    const dia = mapaDias.get(row.data.slice(5))
    if (!dia) return null
    const chave = `${tipo}:${row.id}`
    const anos = Number(dia.slice(0, 4)) - Number(row.data.slice(0, 4))
    return {
      chave,
      tipo,
      membro_id: row.id,
      nome: row.nome,
      conjuge_nome: row.conjuge_nome ?? null,
      data: row.data,
      dia,
      anos: Number.isFinite(anos) && anos >= 0 ? anos : null,
      telefone: row.telefone_principal,
      concluido: feitas.get(chave) === true,
    }
  }

  const automaticos = [
    ...nascimentos.rows.map(r => montar('aniversario', r)),
    ...casamentos.rows.map(r => montar('bodas', r)),
  ]
    .filter((a): a is PautaAutomatico => a !== null)
    .sort((a, b) => (a.dia === b.dia ? a.nome.localeCompare(b.nome) : a.dia.localeCompare(b.dia)))

  const resposta: PautaSemana = {
    congregacao_id: congId,
    congregacao_nome: congNome,
    semana_inicio: semanaInicio,
    semana_fim: semanaFim,
    automaticos,
    itens: itens.rows,
  }
  return Response.json(resposta)
}, { permission: 'pauta_ver' })

/**
 * POST /api/pauta — inclui um item na pauta de uma semana.
 * Body: { congregacao_id, semana_inicio, tipo, titulo, descricao?, data_referencia?, telefone? }
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json().catch(() => ({}))

  const congId = await resolverCongregacao(user, body.congregacao_id ? String(body.congregacao_id) : null)

  const tipo = String(body.tipo || '') as PautaTipo
  if (!TIPOS.includes(tipo)) throw new ApiError(400, 'Tipo de item inválido.')

  const titulo = String(body.titulo || '').trim()
  if (!titulo) throw new ApiError(400, 'Escreva o item da pauta.')

  const semanaInicio = segundaFeira(isISO(body.semana_inicio) ? body.semana_inicio : hojeISO())
  const dataRef = isISO(body.data_referencia) ? body.data_referencia : null
  if ((tipo === 'aniversario' || tipo === 'bodas') && !dataRef) {
    throw new ApiError(400, 'Informe a data do aniversário.')
  }

  const { rows } = await pool.query(
    `INSERT INTO pauta_itens (congregacao_id, semana_inicio, tipo, titulo, descricao, data_referencia, telefone, criado_por)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, congregacao_id, semana_inicio::text AS semana_inicio, tipo, titulo, descricao,
               data_referencia::text AS data_referencia, telefone, concluido, concluido_em,
               adiado_de::text AS adiado_de, created_at`,
    [
      congId, semanaInicio, tipo, titulo,
      String(body.descricao || '').trim() || null,
      dataRef,
      String(body.telefone || '').trim() || null,
      user.id,
    ],
  )
  return Response.json({ ...rows[0], criado_por_nome: user.nome }, { status: 201 })
}, { permission: 'pauta_editar' })
