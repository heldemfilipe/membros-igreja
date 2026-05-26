import pool from '@/lib/db'
import { withAuthParams } from '@/lib/api'

export const PUT = withAuthParams<{ id: string }>(async (req, _user, { params }) => {
  const { nome, descricao, congregacao_id } = await req.json()
  await pool.query(
    'UPDATE departamentos SET nome = $1, descricao = $2, congregacao_id = $3 WHERE id = $4',
    [nome, descricao || null, congregacao_id || null, params.id],
  )
  return Response.json({ message: 'Departamento atualizado com sucesso' })
}, { permission: 'departamentos_editar' })

export const DELETE = withAuthParams<{ id: string }>(async (_req, _user, { params }) => {
  await pool.query('DELETE FROM departamentos WHERE id = $1', [params.id])
  return Response.json({ message: 'Departamento deletado com sucesso' })
}, { permission: 'departamentos_editar' })
