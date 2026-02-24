import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized } from '@/lib/auth'

// Cria a tabela de visitas se não existir
async function ensureVisitasTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS visitas (
        id          SERIAL PRIMARY KEY,
        membro_id   INTEGER NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
        data_visita DATE NOT NULL DEFAULT CURRENT_DATE,
        observacoes TEXT,
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_visitas_membro ON visitas(membro_id)`)
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_visitas_data   ON visitas(data_visita DESC)`)
  } catch {
    // ignora
  }
}

/**
 * GET /api/visitas
 *   ?tipo=recentes&limit=20      → últimas visitas registradas
 *   ?tipo=frequentes&dias=28     → visitantes com 3+ visitas nos últimos N dias
 *   ?membro_id=X                 → visitas de um membro específico
 */
export async function GET(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  await ensureVisitasTable()

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') || 'recentes'
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const dias = parseInt(searchParams.get('dias') || '28')
  const membroId = searchParams.get('membro_id')

  try {
    if (membroId) {
      // Visitas de um membro específico
      const result = await pool.query(
        `SELECT v.id, v.membro_id, m.nome, m.telefone_principal,
                v.data_visita, v.observacoes
         FROM visitas v
         JOIN membros m ON v.membro_id = m.id
         WHERE v.membro_id = $1
         ORDER BY v.data_visita DESC`,
        [membroId]
      )
      return Response.json(result.rows)
    }

    if (tipo === 'frequentes') {
      // Visitantes com 3+ visitas nos últimos N dias
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
        [dias]
      )
      return Response.json(result.rows)
    }

    // Padrão: últimas visitas
    const result = await pool.query(
      `SELECT v.id, v.membro_id, m.nome, m.telefone_principal,
              v.data_visita::text as data_visita, v.observacoes
       FROM visitas v
       JOIN membros m ON v.membro_id = m.id
       ORDER BY v.data_visita DESC, v.created_at DESC
       LIMIT $1`,
      [limit]
    )
    return Response.json(result.rows)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}

/**
 * POST /api/visitas
 * Body: { membro_id, data_visita, observacoes }
 */
export async function POST(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  await ensureVisitasTable()

  const { membro_id, data_visita, observacoes } = await req.json()

  if (!membro_id) {
    return Response.json({ error: 'membro_id é obrigatório' }, { status: 400 })
  }

  try {
    const dataUsada = data_visita || new Date().toISOString().split('T')[0]
    const result = await pool.query(
      'INSERT INTO visitas (membro_id, data_visita, observacoes) VALUES ($1, $2, $3) RETURNING id',
      [membro_id, dataUsada, observacoes || null]
    )
    return Response.json({ id: result.rows[0].id, message: 'Visita registrada!' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
