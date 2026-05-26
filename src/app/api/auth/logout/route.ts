import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth } from '@/lib/api'

export const POST = withAuth(async (req: NextRequest) => {
  const token = req.headers.get('authorization')!.replace(/^Bearer\s+/i, '')
  await pool.query('DELETE FROM sessoes WHERE token = $1', [token])
  return Response.json({ message: 'Logout realizado com sucesso' })
})
