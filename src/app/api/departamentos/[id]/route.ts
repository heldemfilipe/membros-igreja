import pool from '@/lib/db'
import { withAuthParams, ApiError } from '@/lib/api'
import { assertDepartamentoNoEscopo, assertCongregacaoNoEscopo } from '@/lib/scope'

export const PUT = withAuthParams<{ id: string }>(async (req, user, { params }) => {
  await assertDepartamentoNoEscopo(user, params.id, pool)
  const { nome, descricao, congregacao_id } = await req.json()
  if (!nome?.trim()) throw new ApiError(400, 'Nome é obrigatório')
  // Não deixa mover o departamento para fora do escopo do usuário.
  if (congregacao_id != null) assertCongregacaoNoEscopo(user, Number(congregacao_id))

  await pool.query(
    'UPDATE departamentos SET nome = $1, descricao = $2, congregacao_id = $3 WHERE id = $4',
    [nome.trim(), descricao || null, congregacao_id || null, params.id],
  )
  return Response.json({ message: 'Departamento atualizado com sucesso' })
}, { permission: 'departamentos_editar' })

export const DELETE = withAuthParams<{ id: string }>(async (_req, user, { params }) => {
  await assertDepartamentoNoEscopo(user, params.id, pool)
  await pool.query('DELETE FROM departamentos WHERE id = $1', [params.id])
  return Response.json({ message: 'Departamento deletado com sucesso' })
}, { permission: 'departamentos_editar' })
