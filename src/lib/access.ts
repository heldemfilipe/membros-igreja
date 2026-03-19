import { AuthUser } from './auth'

/**
 * Constrói cláusulas WHERE para restringir membros pelo acesso do usuário
 * (departamentos_acesso e congregacoes_acesso) e pelos filtros voluntários
 * de congregação e departamento passados na URL.
 *
 * @param user              - Usuário autenticado (de verificarToken)
 * @param congregacaoParam  - Valor do query param ?congregacao (null = sem filtro)
 * @param options.paramOffset    - Nº de parâmetros já existentes na query (para $N)
 * @param options.tableAlias     - Alias da tabela membros (ex: 'm'), vazio = sem alias
 * @param options.departamentoParam - Filtro explícito de departamento (?departamento=N)
 *
 * @returns { where, params, empty } — cláusulas adicionais, valores
 *          correspondentes, e flag `empty` quando a interseção de restrições
 *          resulta em conjunto vazio (deve retornar [] imediatamente).
 *
 * @example
 * const base = [mes]  // $1
 * const { where, params, empty } = buildAccessWhere(user, congregacaoParam, { paramOffset: 1 })
 * if (empty) return Response.json([])
 * await pool.query(`SELECT ... WHERE ... = $1 ${where}`, [...base, ...params])
 */
export function buildAccessWhere(
  user: AuthUser,
  congregacaoParam: string | null | undefined,
  options?: {
    paramOffset?: number
    tableAlias?: string
    departamentoParam?: string | null
  },
): { where: string; params: unknown[]; empty: boolean } {
  const { paramOffset = 0, tableAlias = '', departamentoParam } = options ?? {}
  const col = (name: string) => (tableAlias ? `${tableAlias}.${name}` : name)

  const deptoAcesso = user.departamentos_acesso?.length ? user.departamentos_acesso : null
  const congAcesso = user.congregacoes_acesso?.length ? user.congregacoes_acesso : null

  const params: unknown[] = []
  let where = ''

  // ── Departamento ──────────────────────────────────────────────────────────
  if (deptoAcesso) {
    // Usuário tem restrição: aplica interseção com filtro voluntário (se houver)
    const effectiveDepts = departamentoParam
      ? deptoAcesso.filter(id => id === parseInt(departamentoParam))
      : deptoAcesso
    if (effectiveDepts.length === 0) return { where: '', params: [], empty: true }
    params.push(effectiveDepts)
    where += ` AND ${col('id')} IN (SELECT membro_id FROM membro_departamentos WHERE departamento_id = ANY($${paramOffset + params.length}::int[]))`
  } else if (departamentoParam) {
    // Usuário sem restrição: filtro explícito simples
    params.push(parseInt(departamentoParam))
    where += ` AND ${col('id')} IN (SELECT membro_id FROM membro_departamentos WHERE departamento_id = $${paramOffset + params.length})`
  }

  // ── Congregação ───────────────────────────────────────────────────────────
  // Combina restrição de acesso + filtro voluntário em um único array
  const effectiveCong = congAcesso
    ? (congregacaoParam && congregacaoParam !== 'sem'
        ? congAcesso.filter(id => id === parseInt(congregacaoParam))
        : congAcesso)
    : (congregacaoParam && congregacaoParam !== 'sem'
        ? [parseInt(congregacaoParam)]
        : null)

  if (effectiveCong) {
    if (effectiveCong.length === 0) return { where: '', params: [], empty: true }
    params.push(effectiveCong)
    where += ` AND ${col('igreja')} IN (SELECT nome FROM congregacoes WHERE id = ANY($${paramOffset + params.length}::int[]))`
  }

  return { where, params, empty: false }
}
