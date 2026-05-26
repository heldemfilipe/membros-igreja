import pool from '@/lib/db'
import { withAuthParams, ApiError } from '@/lib/api'
import { notFound } from '@/lib/auth'

export const GET = withAuthParams<{ id: string }>(async (_req, _user, { params }) => {
  const result = await pool.query(
    'SELECT id, nome, descricao, permissoes, created_at FROM perfis_acesso WHERE id = $1',
    [params.id],
  )
  if (result.rows.length === 0) return notFound('Perfil não encontrado')
  return Response.json(result.rows[0])
}, { adminOnly: true })

export const PUT = withAuthParams<{ id: string }>(async (req, _user, { params }) => {
  const { nome, descricao, permissoes } = await req.json()
  if (!nome?.trim()) throw new ApiError(400, 'Nome é obrigatório')

  await pool.query(
    'UPDATE perfis_acesso SET nome=$1, descricao=$2, permissoes=$3 WHERE id=$4',
    [nome.trim(), descricao || null, JSON.stringify(permissoes || {}), params.id],
  )
  return Response.json({ message: 'Perfil atualizado com sucesso' })
}, { adminOnly: true })

export const DELETE = withAuthParams<{ id: string }>(async (_req, _user, { params }) => {
  await pool.query('UPDATE usuarios SET perfil_id = NULL WHERE perfil_id = $1', [params.id])
  await pool.query('DELETE FROM perfis_acesso WHERE id = $1', [params.id])
  return Response.json({ message: 'Perfil excluído com sucesso' })
}, { adminOnly: true })
