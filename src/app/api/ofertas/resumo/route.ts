import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api'
import { buscarResumoOfertas } from '@/lib/ofertas-resumo'

export const GET = withAuth(async (req: NextRequest, user) => {
  return Response.json(await buscarResumoOfertas(user, new URL(req.url).searchParams))
})
