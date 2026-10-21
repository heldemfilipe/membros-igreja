import pool from '@/lib/db'
import type { AuthUser } from '@/lib/auth'
import { buildAccessWhere } from '@/lib/access'
import { calcularPeriodo, type TipoPeriodo } from '@/lib/crescimento'
import { FAIXAS_PADRAO, faixaDaIdade } from '@/lib/faixas'
import type { CrescimentoData, CrescimentoItem } from '@/types'

/**
 * Painel de crescimento. Conta apenas Membros e Congregados (visitantes
 * entram à parte, só como "visitantes no período").
 *
 * "Ativo em D" = entrou até D e (saiu depois de D, ou ainda não saiu e está
 * ativo). As datas de entrada de cadastros antigos são aproximadas (data do
 * cadastro); vínculo com departamento é o ATUAL (não há histórico).
 */

const ativoEm = (d: string) =>
  `(b.data_entrada <= ${d} AND (b.data_saida > ${d} OR (b.data_saida IS NULL AND b.ativo)))`

const NOVO = `(b.data_entrada BETWEEN $1::date AND $2::date)`
const SAIDA = `(b.data_saida BETWEEN $1::date AND $2::date)`
const ATIVO_FIM = ativoEm('$2::date')

const IDADE_FIM = `CASE WHEN b.data_nascimento IS NULL THEN NULL
  ELSE EXTRACT(YEAR FROM AGE($2::date, b.data_nascimento))::int END`

const n = (v: unknown) => Number(v) || 0
const SEM_INFO = 'Não informado'

export async function buscarCrescimento(user: AuthUser, sp: URLSearchParams): Promise<CrescimentoData> {
  const tipoParam = sp.get('periodo') ?? 'mes'
  const tipo: TipoPeriodo = (['semana', 'mes', 'ano', 'custom'] as const).includes(tipoParam as TipoPeriodo)
    ? (tipoParam as TipoPeriodo)
    : 'mes'
  const hoje = new Date().toISOString().slice(0, 10)
  const periodo = calcularPeriodo(tipo, sp.get('ref') ?? hoje, sp.get('inicio'), sp.get('fim'))

  const { where: f, params: fp, empty } = buildAccessWhere(user, sp.get('congregacao'), {
    paramOffset: 4,
    tableAlias: 'm',
  })
  if (empty) return vazio(periodo)

  const base = `WITH base AS (
    SELECT m.id, m.sexo, m.tipo_participante, m.igreja, m.data_nascimento,
           m.data_entrada, m.data_saida, m.ativo, m.motivo_saida
    FROM membros m
    WHERE m.tipo_participante IN ('Membro','Congregado')${f}
      AND $1::date IS NOT NULL AND $2::date IS NOT NULL AND $3::date IS NOT NULL AND $4::date IS NOT NULL
  )`
  const params = [periodo.inicio, periodo.fim, periodo.anterior_inicio, periodo.anterior_fim, ...fp]
  const q = (sql: string, extra: unknown[] = []) => pool.query(`${base} ${sql}`, [...params, ...extra])

  const deptoAcesso = user.departamentos_acesso?.length ? user.departamentos_acesso : null
  const deptParam = params.length + 1
  const deptFiltro = deptoAcesso ? ` AND md.departamento_id = ANY($${deptParam}::int[])` : ''

  const [resumo, serie, sexo, tipoPart, idades, deptos, motivos, congs, visitas] = await Promise.all([
    q(`SELECT
         COUNT(*) FILTER (WHERE ${ATIVO_FIM}) AS total_fim,
         COUNT(*) FILTER (WHERE ${ativoEm('($1::date - 1)')}) AS total_inicio,
         COUNT(*) FILTER (WHERE ${NOVO}) AS novos,
         COUNT(*) FILTER (WHERE ${SAIDA}) AS saidas,
         COUNT(*) FILTER (WHERE b.data_entrada BETWEEN $3::date AND $4::date) AS novos_ant,
         COUNT(*) FILTER (WHERE b.data_saida BETWEEN $3::date AND $4::date) AS saidas_ant
       FROM base b`),

    q(`SELECT to_char(s.m, 'YYYY-MM') AS mes,
         COUNT(b.id) FILTER (WHERE ${ativoEm('((s.m + interval \'1 month\')::date - 1)')}) AS total,
         COUNT(b.id) FILTER (WHERE date_trunc('month', b.data_entrada) = s.m) AS novos,
         COUNT(b.id) FILTER (WHERE date_trunc('month', b.data_saida) = s.m) AS saidas
       FROM (
         SELECT g::date AS m FROM generate_series(
           date_trunc('month', $2::date) - interval '11 months',
           date_trunc('month', $2::date), interval '1 month') g
       ) s
       LEFT JOIN base b ON TRUE
       GROUP BY s.m ORDER BY s.m`),

    q(`SELECT COALESCE(NULLIF(b.sexo, ''), '${SEM_INFO}') AS nome,
         COUNT(*) FILTER (WHERE ${ATIVO_FIM}) AS total,
         COUNT(*) FILTER (WHERE ${NOVO}) AS novos,
         COUNT(*) FILTER (WHERE ${SAIDA}) AS saidas
       FROM base b GROUP BY 1 ORDER BY 2 DESC`),

    q(`SELECT b.tipo_participante AS nome,
         COUNT(*) FILTER (WHERE ${ATIVO_FIM}) AS total,
         COUNT(*) FILTER (WHERE ${NOVO}) AS novos,
         COUNT(*) FILTER (WHERE ${SAIDA}) AS saidas
       FROM base b GROUP BY 1 ORDER BY 2 DESC`),

    q(`SELECT ${IDADE_FIM} AS idade,
         COUNT(*) FILTER (WHERE ${ATIVO_FIM}) AS total,
         COUNT(*) FILTER (WHERE ${NOVO}) AS novos
       FROM base b GROUP BY 1`),

    q(`SELECT d.id, d.nome, c.nome AS congregacao_nome,
         COUNT(DISTINCT b.id) FILTER (WHERE ${ATIVO_FIM}) AS total,
         COUNT(DISTINCT b.id) FILTER (WHERE ${NOVO}) AS novos
       FROM membro_departamentos md
       JOIN base b ON b.id = md.membro_id
       JOIN departamentos d ON d.id = md.departamento_id
       LEFT JOIN congregacoes c ON c.id = d.congregacao_id
       WHERE TRUE${deptFiltro}
       GROUP BY d.id, d.nome, c.nome
       HAVING COUNT(DISTINCT b.id) FILTER (WHERE ${ATIVO_FIM}) > 0
           OR COUNT(DISTINCT b.id) FILTER (WHERE ${NOVO}) > 0
       ORDER BY total DESC, d.nome`, deptoAcesso ? [deptoAcesso] : []),

    q(`SELECT COALESCE(b.motivo_saida, '${SEM_INFO}') AS motivo, COUNT(*) AS total
       FROM base b WHERE ${SAIDA} GROUP BY 1 ORDER BY 2 DESC`),

    q(`SELECT COALESCE(b.igreja, 'Sem congregação') AS nome,
         COUNT(*) FILTER (WHERE ${ATIVO_FIM}) AS total,
         COUNT(*) FILTER (WHERE ${NOVO}) AS novos,
         COUNT(*) FILTER (WHERE ${SAIDA}) AS saidas,
         COUNT(*) FILTER (WHERE ${ATIVO_FIM} AND ${IDADE_FIM} BETWEEN $${params.length + 1} AND $${params.length + 2}) AS jovens
       FROM base b GROUP BY 1 ORDER BY 2 DESC`, jovensRange()),

    contarVisitantes(user, sp.get('congregacao'), periodo.inicio, periodo.fim),
  ])

  const r = resumo.rows[0]
  const totalInicio = n(r.total_inicio)
  const novos = n(r.novos)
  const saidas = n(r.saidas)
  const saldo = novos - saidas

  // Faixas etárias: agrupa por idade e distribui nas faixas (padrão por enquanto).
  const faixas: CrescimentoItem[] = FAIXAS_PADRAO.map(fx => ({ nome: fx.nome, total: 0, novos: 0 }))
  const semIdade: CrescimentoItem = { nome: SEM_INFO, total: 0, novos: 0 }
  for (const row of idades.rows) {
    const alvo = row.idade == null || row.idade < 0
      ? semIdade
      : (() => {
          const fx = faixaDaIdade(FAIXAS_PADRAO, Number(row.idade))
          return fx ? faixas[FAIXAS_PADRAO.indexOf(fx)] : semIdade
        })()
    alvo.total += n(row.total)
    alvo.novos += n(row.novos)
  }
  if (semIdade.total || semIdade.novos) faixas.push(semIdade)

  const item = (row: Record<string, unknown>): CrescimentoItem => ({
    nome: String(row.nome),
    total: n(row.total),
    novos: n(row.novos),
    saidas: n(row.saidas),
  })

  const data: CrescimentoData = {
    periodo,
    resumo: {
      total_inicio: totalInicio,
      total_fim: n(r.total_fim),
      novos,
      saidas,
      saldo,
      novos_ant: n(r.novos_ant),
      saidas_ant: n(r.saidas_ant),
      saldo_ant: n(r.novos_ant) - n(r.saidas_ant),
      variacao_pct: totalInicio > 0 ? Math.round((saldo / totalInicio) * 1000) / 10 : null,
      visitantes: visitas,
    },
    serie: serie.rows.map(s => ({ mes: s.mes, total: n(s.total), novos: n(s.novos), saidas: n(s.saidas) })),
    por_sexo: sexo.rows.map(item),
    por_tipo: tipoPart.rows.map(item),
    por_faixa: faixas,
    por_departamento: deptos.rows.map(d => ({ ...item(d), congregacao_nome: d.congregacao_nome })),
    saidas_por_motivo: motivos.rows.map(m => ({ motivo: m.motivo, total: n(m.total) })),
    por_congregacao: congs.rows.map(c => ({
      nome: c.nome,
      total: n(c.total),
      novos: n(c.novos),
      saidas: n(c.saidas),
      saldo: n(c.novos) - n(c.saidas),
      jovens: n(c.jovens),
    })),
  }
  return data
}


/** Faixa "Jovens" do padrão, usada na tabela comparativa entre congregações. */
function jovensRange(): [number, number] {
  const j = FAIXAS_PADRAO.find(f => f.nome === 'Jovens')!
  return [j.min, j.max ?? 150]
}

async function contarVisitantes(
  user: Parameters<typeof buildAccessWhere>[0],
  congregacao: string | null,
  inicio: string,
  fim: string,
): Promise<number> {
  try {
    const { where, params, empty } = buildAccessWhere(user, congregacao, { paramOffset: 2, tableAlias: 'm' })
    if (empty) return 0
    const { rows } = await pool.query(
      `SELECT COUNT(DISTINCT m.id)::int AS n
       FROM membros m JOIN visitas v ON v.membro_id = m.id
       WHERE m.tipo_participante = 'Visitante'
         AND v.data_visita BETWEEN $1::date AND $2::date${where}`,
      [inicio, fim, ...params],
    )
    return rows[0].n
  } catch {
    return 0
  }
}

function vazio(periodo: CrescimentoData['periodo']): CrescimentoData {
  return {
    periodo,
    resumo: {
      total_inicio: 0, total_fim: 0, novos: 0, saidas: 0, saldo: 0,
      novos_ant: 0, saidas_ant: 0, saldo_ant: 0, variacao_pct: null, visitantes: 0,
    },
    serie: [], por_sexo: [], por_tipo: [], por_faixa: [],
    por_departamento: [], saidas_por_motivo: [], por_congregacao: [],
  }
}
