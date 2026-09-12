import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, ApiError } from '@/lib/api'
import { congregacoesEfetivas } from '@/lib/scope'
import { slugify } from '@/lib/utils'

export const GET = withAuth(async (_req, user) => {
  // Restrição por congregações — inclui a restrição derivada de departamento
  // (usuário preso só a departamento vê apenas a congregação daqueles deptos).
  const efetivas = await congregacoesEfetivas(user, pool)

  const params: unknown[] = []
  let congWhere = ''
  if (efetivas) {
    if (efetivas.length === 0) return Response.json([])
    congWhere = 'WHERE c.id = ANY($1::int[])'
    params.push(efetivas)
  }

  const result = await pool.query(`
    SELECT c.id, c.nome, c.nome_oficial, c.slug, c.cidade, c.estado, c.observacoes,
      c.dirigente_membro_id, c.dirigente_telefone, c.notificar_whatsapp, c.mensagem_boas_vindas,
      dm.nome AS dirigente_nome,
      COALESCE(NULLIF(dm.telefone_principal, ''), c.dirigente_telefone) AS dirigente_telefone_efetivo,
      COUNT(m.id)::int AS total_membros,
      COALESCE(cu.cultos, '[]'::jsonb) AS cultos
    FROM congregacoes c
    LEFT JOIN membros m ON m.igreja = c.nome
    LEFT JOIN membros dm ON dm.id = c.dirigente_membro_id
    LEFT JOIN (
      SELECT congregacao_id,
        jsonb_agg(jsonb_build_object('id', id, 'nome', nome, 'dia_semana', dia_semana, 'horario', horario) ORDER BY dia_semana, horario) AS cultos
      FROM cultos
      GROUP BY congregacao_id
    ) cu ON cu.congregacao_id = c.id
    ${congWhere}
    GROUP BY c.id, c.nome, c.nome_oficial, c.slug, c.cidade, c.estado, c.observacoes,
      c.dirigente_membro_id, c.dirigente_telefone, c.notificar_whatsapp, c.mensagem_boas_vindas,
      dm.nome, dm.telefone_principal, cu.cultos
    ORDER BY c.nome
  `, params)
  return Response.json(result.rows)
})

export const POST = withAuth(async (req: NextRequest) => {
  const { nome, cidade, estado, observacoes, nome_oficial } = await req.json()
  if (!nome?.trim()) throw new ApiError(400, 'Nome é obrigatório.')

  const base = slugify(nome.trim()) || 'congregacao'
  let slug = base
  for (let i = 2; ; i++) {
    const existe = await pool.query('SELECT 1 FROM congregacoes WHERE slug = $1', [slug])
    if (existe.rows.length === 0) break
    slug = `${base}-${i}`
  }

  const result = await pool.query(
    'INSERT INTO congregacoes (nome, cidade, estado, observacoes, nome_oficial, slug) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [nome.trim(), cidade || null, estado || null, observacoes || null, (nome_oficial || '').trim() || null, slug],
  )
  return Response.json(result.rows[0], { status: 201 })
}, { adminOnly: true })
