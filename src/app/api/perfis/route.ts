import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, ApiError } from '@/lib/api'

export const GET = withAuth(async () => {
  const result = await pool.query(
    'SELECT id, nome, descricao, permissoes, created_at FROM perfis_acesso ORDER BY nome',
  )
  return Response.json(result.rows)
}, { adminOnly: true })

export const POST = withAuth(async (req: NextRequest) => {
  const { nome, descricao, permissoes } = await req.json()
  if (!nome?.trim()) throw new ApiError(400, 'Nome é obrigatório')

  const result = await pool.query(
    'INSERT INTO perfis_acesso (nome, descricao, permissoes) VALUES ($1, $2, $3) RETURNING id',
    [nome.trim(), descricao || null, JSON.stringify(permissoes || {})],
  )
  return Response.json({ id: result.rows[0].id, message: 'Perfil criado com sucesso' })
}, { adminOnly: true })
