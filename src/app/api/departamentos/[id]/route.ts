import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized, forbidden } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()
  if (user.tipo !== 'admin') return forbidden()

  const { id } = params
  const { nome, descricao } = await req.json()

  try {
    await pool.query(
      'UPDATE departamentos SET nome = $1, descricao = $2 WHERE id = $3',
      [nome, descricao || null, id]
    )
    return Response.json({ message: 'Departamento atualizado com sucesso' })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === '23505') {
      return Response.json({ error: 'Nome já existe' }, { status: 400 })
    }
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()
  if (user.tipo !== 'admin') return forbidden()

  const { id } = params

  try {
    await pool.query('DELETE FROM departamentos WHERE id = $1', [id])
    return Response.json({ message: 'Departamento deletado com sucesso' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
