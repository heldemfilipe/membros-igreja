import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth } from '@/lib/api'
import { buildAccessWhere } from '@/lib/access'

export const GET = withAuth(async (req: NextRequest, user) => {
  const { searchParams } = new URL(req.url)
  const mes = searchParams.get('mes') || String(new Date().getMonth() + 1)
  const congregacaoParam = searchParams.get('congregacao')

  const base = [mes]
  const { where, params: accessParams, empty } = buildAccessWhere(user, congregacaoParam, { paramOffset: base.length })
  if (empty) return Response.json([])

  const result = await pool.query(
    `SELECT id, nome, conhecido_como, data_nascimento, telefone_principal, tipo_participante, cargo, igreja
     FROM membros
     WHERE EXTRACT(MONTH FROM data_nascimento) = $1${where}
     ORDER BY EXTRACT(DAY FROM data_nascimento)`,
    [...base, ...accessParams],
  )
  return Response.json(result.rows)
})
