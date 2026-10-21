import type { Pool, PoolClient } from 'pg'
import { ApiError } from './api'
import { FAIXAS_PADRAO, MAX_FAIXAS, type FaixaEtaria } from './faixas-shared'

export * from './faixas-shared'

/**
 * Faixas etárias. Cada conjunto cobre todas as idades: começa em 0 e a última
 * faixa não tem limite superior. O usuário só informa nome + idade inicial de
 * cada faixa; o limite superior sai da faixa seguinte (min seguinte − 1),
 * então é impossível criar buracos ou sobreposição.
 */

type DB = Pool | PoolClient

/**
 * Valida a entrada (nome + idade inicial) e devolve as faixas completas.
 * Lança ApiError(400) com mensagem legível.
 */
export function montarFaixas(entrada: unknown): FaixaEtaria[] {
  if (!Array.isArray(entrada) || entrada.length === 0) {
    throw new ApiError(400, 'Informe ao menos uma faixa etária.')
  }
  if (entrada.length > MAX_FAIXAS) {
    throw new ApiError(400, `No máximo ${MAX_FAIXAS} faixas etárias.`)
  }

  const itens = entrada.map((e, i) => {
    const nome = typeof e?.nome === 'string' ? e.nome.trim() : ''
    const min = Number(e?.min)
    if (!nome) throw new ApiError(400, `Faixa ${i + 1}: informe o nome.`)
    if (nome.length > 30) throw new ApiError(400, `Faixa "${nome.slice(0, 30)}": nome com no máximo 30 caracteres.`)
    if (!Number.isInteger(min) || min < 0 || min > 120) {
      throw new ApiError(400, `Faixa "${nome}": a idade inicial deve ser um número de 0 a 120.`)
    }
    return { nome, min }
  })

  if (itens[0].min !== 0) throw new ApiError(400, 'A primeira faixa deve começar em 0 anos.')
  const nomes = new Set<string>()
  itens.forEach((it, i) => {
    const chave = it.nome.toLowerCase()
    if (nomes.has(chave)) throw new ApiError(400, `Nome repetido: "${it.nome}".`)
    nomes.add(chave)
    if (i > 0 && it.min <= itens[i - 1].min) {
      throw new ApiError(400, `"${it.nome}" deve começar depois de "${itens[i - 1].nome}" (${itens[i - 1].min} anos).`)
    }
  })

  return itens.map((it, i) => ({
    nome: it.nome,
    min: it.min,
    max: i < itens.length - 1 ? itens[i + 1].min - 1 : null,
  }))
}

/** Substitui o conjunto de faixas (padrão geral se congregacaoId = null). */
export async function salvarFaixas(db: DB, congregacaoId: number | null, faixas: FaixaEtaria[]): Promise<void> {
  await db.query('DELETE FROM faixas_etarias WHERE congregacao_id IS NOT DISTINCT FROM $1', [congregacaoId])
  for (let i = 0; i < faixas.length; i++) {
    const f = faixas[i]
    await db.query(
      `INSERT INTO faixas_etarias (congregacao_id, nome, idade_min, idade_max, ordem)
       VALUES ($1,$2,$3,$4,$5)`,
      [congregacaoId, f.nome, f.min, f.max, i + 1],
    )
  }
}

async function lerConjunto(db: DB, congregacaoId: number | null): Promise<FaixaEtaria[]> {
  const { rows } = await db.query(
    `SELECT nome, idade_min, idade_max FROM faixas_etarias
     WHERE congregacao_id IS NOT DISTINCT FROM $1 ORDER BY idade_min`,
    [congregacaoId],
  )
  return rows.map(r => ({ nome: r.nome, min: r.idade_min, max: r.idade_max }))
}

export async function carregarPadrao(db: DB): Promise<FaixaEtaria[]> {
  const g = await lerConjunto(db, null)
  return g.length ? g : FAIXAS_PADRAO
}

/**
 * Faixas efetivas: as da congregação, se personalizadas; senão o padrão geral.
 * `personalizada` diz de qual conjunto vieram.
 */
export async function carregarFaixas(
  db: DB,
  congregacaoId: number | null,
): Promise<{ faixas: FaixaEtaria[]; personalizada: boolean }> {
  if (congregacaoId != null) {
    const propria = await lerConjunto(db, congregacaoId)
    if (propria.length) return { faixas: propria, personalizada: true }
  }
  return { faixas: await carregarPadrao(db), personalizada: false }
}

export function mesmasFaixas(a: FaixaEtaria[], b: FaixaEtaria[]): boolean {
  return a.length === b.length && a.every((f, i) => f.min === b[i].min && f.nome === b[i].nome)
}
