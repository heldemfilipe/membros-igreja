import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized, forbidden } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()
  if (user.tipo !== 'admin') return forbidden()

  try {
    const result = await pool.query(
      'SELECT id, nome, descricao, permissoes, created_at FROM perfis_acesso WHERE id = $1',
      [params.id]
    )
    if (result.rows.length === 0) {
      return Response.json({ error: 'Perfil não encontrado' }, { status: 404 })
    }
    return Response.json(result.rows[0])
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()
  if (user.tipo !== 'admin') return forbidden()

  const { nome, descricao, permissoes } = await req.json()

  if (!nome?.trim()) {
    return Response.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }

  try {
    await pool.query(
      'UPDATE perfis_acesso SET nome=$1, descricao=$2, permissoes=$3 WHERE id=$4',
      [nome.trim(), descricao || null, JSON.stringify(permissoes || {}), params.id]
    )
    return Response.json({ message: 'Perfil atualizado com sucesso' })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === '23505') {
      return Response.json({ error: 'Já existe um perfil com este nome' }, { status: 400 })
    }
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()
  if (user.tipo !== 'admin') return forbidden()

  try {
    // Desvincula usuários com este perfil
    await pool.query('UPDATE usuarios SET perfil_id = NULL WHERE perfil_id = $1', [params.id])
    await pool.query('DELETE FROM perfis_acesso WHERE id = $1', [params.id])
    return Response.json({ message: 'Perfil excluído com sucesso' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
