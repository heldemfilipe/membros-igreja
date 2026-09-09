import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, ApiError } from '@/lib/api'

export const GET = withAuth(async () => {
  const r = await pool.query('SELECT id, titulo, texto, created_at FROM mensagem_modelo ORDER BY titulo')
  return Response.json(r.rows)
}, { permission: 'recepcao' })

export const POST = withAuth(async (req: NextRequest) => {
  const { titulo, texto } = await req.json()
  if (!titulo?.trim() || !texto?.trim()) throw new ApiError(400, 'Título e texto são obrigatórios.')
  const r = await pool.query(
    'INSERT INTO mensagem_modelo (titulo, texto) VALUES ($1, $2) RETURNING id, titulo, texto',
    [titulo.trim(), texto.trim()],
  )
  return Response.json(r.rows[0], { status: 201 })
}, { permission: 'recepcao' })
