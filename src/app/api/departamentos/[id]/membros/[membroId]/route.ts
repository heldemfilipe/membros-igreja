import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized, forbidden } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string; membroId: string } }) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()
  if (user.tipo !== 'admin') return forbidden()

  const { id, membroId } = params
  const { cargo_departamento } = await req.json()

  try {
    await pool.query(
      'UPDATE membro_departamentos SET cargo_departamento = $1 WHERE departamento_id = $2 AND membro_id = $3',
      [cargo_departamento || null, id, membroId]
    )
    return Response.json({ message: 'Cargo atualizado com sucesso' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string; membroId: string } }) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()
  if (user.tipo !== 'admin') return forbidden()

  const { id, membroId } = params

  try {
    await pool.query(
      'DELETE FROM membro_departamentos WHERE departamento_id = $1 AND membro_id = $2',
      [id, membroId]
    )
    return Response.json({ message: 'Membro removido do departamento' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
