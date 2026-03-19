import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized } from '@/lib/auth'
import { buildAccessWhere } from '@/lib/access'

export async function GET(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  const { searchParams } = new URL(req.url)
  const mes = searchParams.get('mes') || String(new Date().getMonth() + 1)
  const congregacaoParam = searchParams.get('congregacao')

  try {
    const base = [mes]
    const { where, params: accessParams, empty } = buildAccessWhere(user, congregacaoParam, { paramOffset: base.length })
    if (empty) return Response.json([])

    const result = await pool.query(
      `SELECT id, nome, conhecido_como, data_nascimento, telefone_principal, tipo_participante, cargo, igreja
       FROM membros
       WHERE EXTRACT(MONTH FROM data_nascimento) = $1${where}
       ORDER BY EXTRACT(DAY FROM data_nascimento)`,
      [...base, ...accessParams]
    )
    return Response.json(result.rows)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
