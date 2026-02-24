import { NextRequest } from 'next/server'
import { verificarToken, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()
  return Response.json({ usuario: user })
}
