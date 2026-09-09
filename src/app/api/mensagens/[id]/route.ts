import pool from '@/lib/db'
import { withAuthParams, ApiError } from '@/lib/api'
import { notFound } from '@/lib/auth'

export const PUT = withAuthParams<{ id: string }>(async (req, _user, { params }) => {
  const { titulo, texto } = await req.json()
  if (!titulo?.trim() || !texto?.trim()) throw new ApiError(400, 'Título e texto são obrigatórios.')
  const r = await pool.query(
    'UPDATE mensagem_modelo SET titulo=$1, texto=$2 WHERE id=$3 RETURNING id, titulo, texto',
    [titulo.trim(), texto.trim(), params.id],
  )
  if (r.rows.length === 0) return notFound('Frase não encontrada.')
  return Response.json(r.rows[0])
}, { permission: 'recepcao' })

export const DELETE = withAuthParams<{ id: string }>(async (_req, _user, { params }) => {
  await pool.query('DELETE FROM mensagem_modelo WHERE id = $1', [params.id])
  return Response.json({ message: 'Frase excluída.' })
}, { permission: 'recepcao' })
