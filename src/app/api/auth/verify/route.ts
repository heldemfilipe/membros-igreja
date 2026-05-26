import { withAuth } from '@/lib/api'

export const GET = withAuth(async (_req, user) => Response.json({ usuario: user }))
