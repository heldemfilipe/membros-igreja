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
    const { where: extraWhere, params: accessParams, empty } = buildAccessWhere(user, congregacaoParam, {
      paramOffset: base.length,
      tableAlias: 'm',
    })
    if (empty) return Response.json([])
    const params = [...base, ...accessParams]

    // Query uses UNION ALL to cover two cases:
    // 1. Member has their own data_casamento in this month
    // 2. Member has no data_casamento but their linked spouse does (auto-fill)
    // DISTINCT ON (LEAST(id, conjuge_id)) deduplicates couples regardless of ID order.
    const result = await pool.query(
      `WITH todos AS (
        SELECT
          m.id, m.nome, m.data_casamento, m.sexo,
          m.telefone_principal, m.tipo_participante, m.igreja,
          f.membro_vinculado_id AS conjuge_id,
          mc.nome AS conjuge_nome
        FROM membros m
        LEFT JOIN familiares f
          ON f.membro_id = m.id
          AND f.parentesco = 'Cônjuge'
          AND f.membro_vinculado_id IS NOT NULL
        LEFT JOIN membros mc ON mc.id = f.membro_vinculado_id
        WHERE m.data_casamento IS NOT NULL
          AND EXTRACT(MONTH FROM m.data_casamento) = $1
          ${extraWhere}

        UNION ALL

        SELECT
          m.id, m.nome, mc.data_casamento, m.sexo,
          m.telefone_principal, m.tipo_participante, m.igreja,
          mc.id AS conjuge_id,
          mc.nome AS conjuge_nome
        FROM membros m
        JOIN familiares f
          ON f.membro_id = m.id
          AND f.parentesco = 'Cônjuge'
          AND f.membro_vinculado_id IS NOT NULL
        JOIN membros mc ON mc.id = f.membro_vinculado_id
        WHERE m.data_casamento IS NULL
          AND mc.data_casamento IS NOT NULL
          AND EXTRACT(MONTH FROM mc.data_casamento) = $1
          ${extraWhere}
      )
      SELECT id, nome, data_casamento, sexo, telefone_principal, tipo_participante, igreja, conjuge_id, conjuge_nome
      FROM (
        SELECT DISTINCT ON (LEAST(id, COALESCE(conjuge_id, id)))
          id, nome, data_casamento, sexo, telefone_principal, tipo_participante, igreja, conjuge_id, conjuge_nome
        FROM todos
        ORDER BY LEAST(id, COALESCE(conjuge_id, id))
      ) dedup
      ORDER BY EXTRACT(DAY FROM data_casamento)`,
      params
    )
    return Response.json(result.rows)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
