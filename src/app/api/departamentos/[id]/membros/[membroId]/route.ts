import pool from '@/lib/db'
import { withAuthParams } from '@/lib/api'
import { forbidden } from '@/lib/auth'
import { assertDepartamentoNoEscopo } from '@/lib/scope'
import { membroAcessivel } from '@/lib/access'

export const PUT = withAuthParams<{ id: string; membroId: string }>(async (req, user, { params }) => {
  await assertDepartamentoNoEscopo(user, params.id, pool)
  if (!(await membroAcessivel(user, params.membroId, pool))) {
    return forbidden('Este membro não está no seu escopo de acesso.')
  }
  const { cargo_departamento } = await req.json()
  await pool.query(
    'UPDATE membro_departamentos SET cargo_departamento = $1 WHERE departamento_id = $2 AND membro_id = $3',
    [cargo_departamento || null, params.id, params.membroId],
  )
  return Response.json({ message: 'Cargo atualizado com sucesso' })
}, { permission: 'departamentos_editar' })

export const DELETE = withAuthParams<{ id: string; membroId: string }>(async (_req, user, { params }) => {
  await assertDepartamentoNoEscopo(user, params.id, pool)
  if (!(await membroAcessivel(user, params.membroId, pool))) {
    return forbidden('Este membro não está no seu escopo de acesso.')
  }
  await pool.query(
    'DELETE FROM membro_departamentos WHERE departamento_id = $1 AND membro_id = $2',
    [params.id, params.membroId],
  )
  return Response.json({ message: 'Membro removido do departamento' })
}, { permission: 'departamentos_editar' })
