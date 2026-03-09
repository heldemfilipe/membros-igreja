import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized, forbidden } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  // Restrições de acesso
  const deptoAcesso = user.departamentos_acesso && user.departamentos_acesso.length > 0
    ? user.departamentos_acesso : null
  const congAcesso = user.congregacoes_acesso && user.congregacoes_acesso.length > 0
    ? user.congregacoes_acesso : null

  // Lazy migration: garante que a coluna congregacao_id existe
  try { await pool.query('ALTER TABLE departamentos ADD COLUMN IF NOT EXISTS congregacao_id INTEGER') } catch { }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = []
    const conditions: string[] = []

    if (deptoAcesso) {
      params.push(deptoAcesso)
      conditions.push(`d.id = ANY($${params.length}::int[])`)
    }
    if (congAcesso) {
      params.push(congAcesso)
      // Mostra departamentos da congregação OU departamentos sem congregação atribuída quando não há restrição de dept
      conditions.push(`(d.congregacao_id = ANY($${params.length}::int[]) OR d.congregacao_id IS NULL)`)
    }

    const where = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : ''

    const result = await pool.query(
      `SELECT d.*,
              c.nome as congregacao_nome,
              (SELECT COUNT(*) FROM membro_departamentos md WHERE md.departamento_id = d.id) as total_membros
       FROM departamentos d
       LEFT JOIN congregacoes c ON d.congregacao_id = c.id
       ${where}
       ORDER BY c.nome NULLS LAST, d.nome`,
      params
    )
    return Response.json(result.rows)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()
  if (user.tipo !== 'admin' && !user.permissoes.departamentos_editar) return forbidden('Sem permissão para criar departamentos.')

  const { nome, descricao, congregacao_id } = await req.json()

  if (!nome) {
    return Response.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }

  try {
    const result = await pool.query(
      'INSERT INTO departamentos (nome, descricao, congregacao_id) VALUES ($1, $2, $3) RETURNING id',
      [nome, descricao || null, congregacao_id || null]
    )
    return Response.json({ id: result.rows[0].id, message: 'Departamento criado com sucesso' })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === '23505') {
      return Response.json({ error: 'Departamento já existe' }, { status: 400 })
    }
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
