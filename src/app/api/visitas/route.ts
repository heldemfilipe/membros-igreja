import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, ApiError } from '@/lib/api'

/**
 * GET /api/visitas
 *   ?tipo=recentes&limit=20      → últimas visitas registradas
 *   ?tipo=frequentes&dias=28     → visitantes com 3+ visitas nos últimos N dias
 *   ?membro_id=X                 → visitas de um membro específico
 */
export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') || 'recentes'
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const dias = parseInt(searchParams.get('dias') || '28')
  const membroId = searchParams.get('membro_id')

  if (membroId) {
    const result = await pool.query(
      `SELECT v.id, v.membro_id, m.nome, m.telefone_principal,
              v.data_visita, v.observacoes
       FROM visitas v
       JOIN membros m ON v.membro_id = m.id
       WHERE v.membro_id = $1
       ORDER BY v.data_visita DESC`,
      [membroId],
    )
    return Response.json(result.rows)
  }

  if (tipo === 'frequentes') {
    const result = await pool.query(
      `SELECT v.membro_id, m.nome, m.telefone_principal,
              COUNT(*) as total_visitas,
              MAX(v.data_visita)::text as ultima_visita,
              MIN(v.data_visita)::text as primeira_visita
       FROM visitas v
       JOIN membros m ON v.membro_id = m.id
       WHERE m.tipo_participante = 'Visitante'
         AND v.data_visita >= CURRENT_DATE - $1::int
       GROUP BY v.membro_id, m.nome, m.telefone_principal
       HAVING COUNT(*) >= 3
       ORDER BY total_visitas DESC, ultima_visita DESC`,
      [dias],
    )
    return Response.json(result.rows)
  }

  const result = await pool.query(
    `SELECT v.id, v.membro_id, m.nome, m.telefone_principal,
            v.data_visita::text as data_visita, v.observacoes
     FROM visitas v
     JOIN membros m ON v.membro_id = m.id
     ORDER BY v.data_visita DESC, v.created_at DESC
     LIMIT $1`,
    [limit],
  )
  return Response.json(result.rows)
})

/**
 * POST /api/visitas
 * Body: { membro_id, data_visita, observacoes }
 */
export const POST = withAuth(async (req: NextRequest) => {
  const { membro_id, data_visita, observacoes } = await req.json()
  if (!membro_id) throw new ApiError(400, 'membro_id é obrigatório')

  const dataUsada = data_visita || new Date().toISOString().split('T')[0]
  const result = await pool.query(
    'INSERT INTO visitas (membro_id, data_visita, observacoes) VALUES ($1, $2, $3) RETURNING id',
    [membro_id, dataUsada, observacoes || null],
  )
  return Response.json({ id: result.rows[0].id, message: 'Visita registrada!' })
})
