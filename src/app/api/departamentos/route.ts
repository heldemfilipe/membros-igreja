import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, ApiError } from '@/lib/api'
import { assertCongregacaoNoEscopo } from '@/lib/scope'

export const GET = withAuth(async (req: NextRequest, user) => {
  const { searchParams } = new URL(req.url)
  const congregacaoParam = searchParams.get('congregacao')

  // Restrições de acesso
  const deptoAcesso = user.departamentos_acesso?.length ? user.departamentos_acesso : null
  const congAcesso = user.congregacoes_acesso?.length ? user.congregacoes_acesso : null

  // Congregações efetivas (restrição + filtro voluntário)
  const effectiveCong = congAcesso
    ? (congregacaoParam ? congAcesso.filter(id => id === parseInt(congregacaoParam)) : congAcesso)
    : (congregacaoParam ? [parseInt(congregacaoParam)] : null)

  const params: unknown[] = []
  const conditions: string[] = []

  if (deptoAcesso) {
    params.push(deptoAcesso)
    conditions.push(`d.id = ANY($${params.length}::int[])`)
  }
  if (effectiveCong) {
    params.push(effectiveCong)
    // Usuário restrito vê só os departamentos da(s) sua(s) congregação(ões).
    // Departamentos sem congregação ("legados") ficam visíveis apenas para o admin.
    conditions.push(`d.congregacao_id = ANY($${params.length}::int[])`)
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
    params,
  )
  return Response.json(result.rows)
})

export const POST = withAuth(async (req: NextRequest, user) => {
  const { nome, descricao, congregacao_id } = await req.json()
  if (!nome) throw new ApiError(400, 'Nome é obrigatório')

  // Todo departamento pertence a uma congregação — não existe departamento "global".
  if (congregacao_id == null || congregacao_id === '') {
    throw new ApiError(400, 'Selecione a congregação do departamento.')
  }
  assertCongregacaoNoEscopo(user, Number(congregacao_id))

  const result = await pool.query(
    'INSERT INTO departamentos (nome, descricao, congregacao_id) VALUES ($1, $2, $3) RETURNING id',
    [nome, descricao || null, Number(congregacao_id)],
  )
  return Response.json({ id: result.rows[0].id, message: 'Departamento criado com sucesso' })
}, { permission: 'departamentos_editar' })
