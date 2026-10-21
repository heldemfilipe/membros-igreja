import pool from '@/lib/db'
import { ApiError } from '@/lib/api'
import type { AuthUser } from '@/lib/auth'
import { assertCongregacaoNoEscopoDb, congregacoesEfetivas } from '@/lib/scope'
import { calcularPeriodo, type Periodo, type TipoPeriodo } from '@/lib/crescimento'
import { podeVerOfertas, podeEditarQualquer, TIPOS_OFERTA, type TipoOferta } from '@/lib/ofertas'

/**
 * Resumo de ofertas para quem tem `ofertas_ver`/`ofertas_editar`: totais do
 * período e do anterior, evolução, por congregação, por culto e cultos
 * esperados (pela agenda de cultos) que ficaram sem lançamento.
 */

export type Totais = Record<TipoOferta, number> & { total: number; lancamentos: number }

export interface ResumoOfertas {
  periodo: Periodo
  atual: Totais
  anterior: Totais
  serie: ({ chave: string } & Totais)[]
  granularidade: 'dia' | 'mes'
  por_congregacao: ({ id: number; nome: string } & Totais)[]
  por_culto: ({ culto: string } & Totais)[]
  sem_lancamento: { data: string; congregacao: string; culto: string; horario: string }[]
  /** congregações com cultos na agenda que ainda não lançaram nada */
  nunca_lancaram: string[]
}

const TIPOS = TIPOS_OFERTA.map(t => t.key)
const SOMAS = (filtro: string) =>
  TIPOS.map(t => `COALESCE(SUM(o.${t}) FILTER (WHERE ${filtro}), 0) AS ${t}`).join(',\n')

function totais(row: Record<string, unknown> | undefined, qtd = 'lancamentos'): Totais {
  const t = { total: 0, lancamentos: Number(row?.[qtd]) || 0 } as Totais
  for (const k of TIPOS) {
    t[k] = Number(row?.[k]) || 0
    t.total += t[k]
  }
  t.total = Math.round(t.total * 100) / 100
  return t
}

export function exigirAcessoResumo(user: AuthUser) {
  if (!podeVerOfertas(user) && !podeEditarQualquer(user)) {
    throw new ApiError(403, 'Você não tem permissão para ver o resumo de ofertas.')
  }
}

/** Período + congregações em jogo (null = todas), a partir da URL. */
export async function lerFiltros(user: AuthUser, sp: URLSearchParams) {
  const tipoParam = sp.get('periodo') ?? 'mes'
  const tipo: TipoPeriodo = (['dia', 'semana', 'mes', 'ano', 'custom'] as const).includes(tipoParam as TipoPeriodo)
    ? (tipoParam as TipoPeriodo)
    : 'mes'
  const hoje = new Date().toISOString().slice(0, 10)
  const periodo = calcularPeriodo(tipo, sp.get('ref') ?? hoje, sp.get('inicio'), sp.get('fim'))

  let congs: number[] | null
  const congParam = sp.get('congregacao')
  if (congParam) {
    const id = Number(congParam)
    await assertCongregacaoNoEscopoDb(user, id, pool)
    congs = [id]
  } else {
    congs = await congregacoesEfetivas(user, pool)
  }
  return { periodo, congs }
}

export async function buscarResumoOfertas(user: AuthUser, sp: URLSearchParams): Promise<ResumoOfertas> {
  exigirAcessoResumo(user)
  const { periodo, congs } = await lerFiltros(user, sp)
  const granularidade = periodo.tipo === 'ano' ? 'mes' : 'dia'

  if (congs && congs.length === 0) {
    const zero = totais(undefined)
    return { periodo, atual: zero, anterior: zero, serie: [], granularidade, por_congregacao: [], por_culto: [], sem_lancamento: [], nunca_lancaram: [] }
  }

  const params = [periodo.inicio, periodo.fim, periodo.anterior_inicio, periodo.anterior_fim, congs]
  const CONG = `($5::int[] IS NULL OR o.congregacao_id = ANY($5::int[]))`
  const ATUAL = `o.data_culto BETWEEN $1::date AND $2::date`
  const ANT = `o.data_culto BETWEEN $3::date AND $4::date`
  // Garante que todos os parâmetros aparecem em todas as consultas (tipagem do Postgres).
  const USA = `$1::date IS NOT NULL AND $2::date IS NOT NULL AND $3::date IS NOT NULL AND $4::date IS NOT NULL`

  const passo = granularidade === 'mes' ? `interval '1 month'` : `interval '1 day'`
  const chave = granularidade === 'mes' ? `to_char(s.d, 'YYYY-MM')` : `to_char(s.d, 'YYYY-MM-DD')`
  const trunc = granularidade === 'mes' ? `date_trunc('month', o.data_culto)::date` : `o.data_culto`

  const [tot, serie, porCong, porCulto, faltando, nunca] = await Promise.all([
    pool.query(
      `SELECT ${SOMAS(ATUAL)},
              COUNT(*) FILTER (WHERE ${ATUAL}) AS lancamentos,
              ${TIPOS.map(t => `COALESCE(SUM(o.${t}) FILTER (WHERE ${ANT}), 0) AS ant_${t}`).join(', ')},
              COUNT(*) FILTER (WHERE ${ANT}) AS ant_lancamentos
       FROM ofertas o WHERE ${CONG} AND ${USA}`,
      params,
    ),
    pool.query(
      `SELECT ${chave} AS chave, ${TIPOS.map(t => `COALESCE(SUM(o.${t}), 0) AS ${t}`).join(', ')},
              COUNT(o.id) AS lancamentos
       FROM (SELECT g::date AS d FROM generate_series(
               ${granularidade === 'mes' ? `date_trunc('month', $1::date)` : '$1::date'}, $2::date, ${passo}) g) s
       LEFT JOIN ofertas o ON ${trunc} = s.d AND ${CONG}
       WHERE ${USA}
       GROUP BY s.d ORDER BY s.d`,
      params,
    ),
    pool.query(
      `SELECT c.id, c.nome, ${TIPOS.map(t => `COALESCE(SUM(o.${t}), 0) AS ${t}`).join(', ')},
              COUNT(o.id) AS lancamentos
       FROM congregacoes c
       LEFT JOIN ofertas o ON o.congregacao_id = c.id AND ${ATUAL}
       WHERE ($5::int[] IS NULL OR c.id = ANY($5::int[])) AND ${USA}
       GROUP BY c.id, c.nome ORDER BY c.nome`,
      params,
    ),
    pool.query(
      `SELECT o.culto_nome AS culto, ${TIPOS.map(t => `SUM(o.${t}) AS ${t}`).join(', ')}, COUNT(*) AS lancamentos
       FROM ofertas o WHERE ${ATUAL} AND ${CONG} AND ${USA}
       GROUP BY o.culto_nome ORDER BY SUM(o.dizimos + o.ofertas + o.missoes + o.outros) DESC`,
      params,
    ),
    // Cultos da agenda sem lançamento: só de dias já passados e a partir do
    // primeiro lançamento da congregação (antes disso o sistema não era usado).
    pool.query(
      `WITH inicio AS (
         SELECT congregacao_id, MIN(data_culto) AS primeiro FROM ofertas GROUP BY congregacao_id
       )
       SELECT to_char(s.d, 'YYYY-MM-DD') AS data, cg.nome AS congregacao, cu.nome AS culto, cu.horario
       FROM (SELECT g::date AS d FROM generate_series($1::date, LEAST($2::date, CURRENT_DATE - 1), interval '1 day') g) s
       JOIN cultos cu ON cu.dia_semana = EXTRACT(DOW FROM s.d)
       JOIN congregacoes cg ON cg.id = cu.congregacao_id
       JOIN inicio i ON i.congregacao_id = cu.congregacao_id AND s.d >= i.primeiro
       WHERE ($5::int[] IS NULL OR cu.congregacao_id = ANY($5::int[])) AND ${USA}
         AND NOT EXISTS (
           SELECT 1 FROM ofertas o
           WHERE o.congregacao_id = cu.congregacao_id AND o.data_culto = s.d
             AND (o.culto_id = cu.id OR lower(o.culto_nome) = lower(cu.nome))
         )
       ORDER BY s.d DESC, cg.nome, cu.horario
       LIMIT 100`,
      params,
    ),
    pool.query(
      `SELECT DISTINCT cg.nome FROM cultos cu JOIN congregacoes cg ON cg.id = cu.congregacao_id
       WHERE ($5::int[] IS NULL OR cg.id = ANY($5::int[])) AND ${USA}
         AND NOT EXISTS (SELECT 1 FROM ofertas o WHERE o.congregacao_id = cg.id)
       ORDER BY cg.nome`,
      params,
    ),
  ])

  const t = tot.rows[0]
  const anteriorRow = Object.fromEntries([...TIPOS, 'lancamentos'].map(k => [k, t[`ant_${k}`]]))
  return {
    periodo,
    atual: totais(t),
    anterior: totais(anteriorRow),
    granularidade,
    serie: serie.rows.map(r => ({ chave: r.chave, ...totais(r) })),
    por_congregacao: porCong.rows.map(r => ({ id: r.id, nome: r.nome, ...totais(r) })),
    por_culto: porCulto.rows.map(r => ({ culto: r.culto, ...totais(r) })),
    sem_lancamento: faltando.rows,
    nunca_lancaram: nunca.rows.map(r => r.nome),
  }
}
