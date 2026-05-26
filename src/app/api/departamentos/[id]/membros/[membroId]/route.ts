import pool from '@/lib/db'
import { withAuthParams } from '@/lib/api'

export const PUT = withAuthParams<{ id: string; membroId: string }>(async (req, _user, { params }) => {
  const { cargo_departamento } = await req.json()
  await pool.query(
    'UPDATE membro_departamentos SET cargo_departamento = $1 WHERE departamento_id = $2 AND membro_id = $3',
    [cargo_departamento || null, params.id, params.membroId],
  )
  return Response.json({ message: 'Cargo atualizado com sucesso' })
}, { adminOnly: true })

export const DELETE = withAuthParams<{ id: string; membroId: string }>(async (_req, _user, { params }) => {
  await pool.query(
    'DELETE FROM membro_departamentos WHERE departamento_id = $1 AND membro_id = $2',
    [params.id, params.membroId],
  )
  return Response.json({ message: 'Membro removido do departamento' })
}, { adminOnly: true })
