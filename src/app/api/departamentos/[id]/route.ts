import pool from '@/lib/db'
import { withAuthParams, ApiError } from '@/lib/api'
import { assertDepartamentoNoEscopo, assertCongregacaoNoEscopoDb } from '@/lib/scope'

export const PUT = withAuthParams<{ id: string }>(async (req, user, { params }) => {
  await assertDepartamentoNoEscopo(user, params.id, pool)
  const { nome, descricao, congregacao_id } = await req.json()
  if (!nome?.trim()) throw new ApiError(400, 'Nome é obrigatório')
  // Todo departamento pertence a uma congregação (sem "global").
  if (congregacao_id == null || congregacao_id === '') {
    throw new ApiError(400, 'Selecione a congregação do departamento.')
  }
  // Não deixa mover o departamento para fora do escopo do usuário.
  await assertCongregacaoNoEscopoDb(user, Number(congregacao_id), pool)

  await pool.query(
    'UPDATE departamentos SET nome = $1, descricao = $2, congregacao_id = $3 WHERE id = $4',
    [nome.trim(), descricao || null, Number(congregacao_id), params.id],
  )
  return Response.json({ message: 'Departamento atualizado com sucesso' })
}, { permission: 'departamentos_editar' })

export const DELETE = withAuthParams<{ id: string }>(async (_req, user, { params }) => {
  await assertDepartamentoNoEscopo(user, params.id, pool)
  await pool.query('DELETE FROM departamentos WHERE id = $1', [params.id])
  return Response.json({ message: 'Departamento deletado com sucesso' })
}, { permission: 'departamentos_editar' })
