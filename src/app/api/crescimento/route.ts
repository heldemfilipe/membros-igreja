import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api'
import { buscarCrescimento } from '@/lib/crescimento-query'

export const GET = withAuth(async (req: NextRequest, user) => {
  return Response.json(await buscarCrescimento(user, new URL(req.url).searchParams))
}, { permission: 'crescimento_ver' })
