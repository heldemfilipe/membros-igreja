import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  const token = req.headers.get('authorization')!.replace('Bearer ', '')

  try {
    await pool.query('DELETE FROM sessoes WHERE token = $1', [token])
    return Response.json({ message: 'Logout realizado com sucesso' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
