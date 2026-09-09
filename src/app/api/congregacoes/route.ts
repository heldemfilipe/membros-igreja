import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, ApiError } from '@/lib/api'
import { congregacoesEfetivas } from '@/lib/scope'

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
    SELECT c.id, c.nome, c.cidade, c.estado, c.observacoes,
      c.dirigente_membro_id, c.dirigente_telefone, c.notificar_whatsapp, c.mensagem_boas_vindas,
      dm.nome AS dirigente_nome,
      COALESCE(NULLIF(dm.telefone_principal, ''), c.dirigente_telefone) AS dirigente_telefone_efetivo,
      COUNT(m.id)::int AS total_membros
    FROM congregacoes c
    LEFT JOIN membros m ON m.igreja = c.nome
    LEFT JOIN membros dm ON dm.id = c.dirigente_membro_id
    ${congWhere}
    GROUP BY c.id, c.nome, c.cidade, c.estado, c.observacoes,
      c.dirigente_membro_id, c.dirigente_telefone, c.notificar_whatsapp, c.mensagem_boas_vindas,
      dm.nome, dm.telefone_principal
    ORDER BY c.nome
  `, params)
  return Response.json(result.rows)
})

export const POST = withAuth(async (req: NextRequest) => {
  const { nome, cidade, estado, observacoes } = await req.json()
  if (!nome?.trim()) throw new ApiError(400, 'Nome é obrigatório.')

  const result = await pool.query(
    'INSERT INTO congregacoes (nome, cidade, estado, observacoes) VALUES ($1,$2,$3,$4) RETURNING *',
    [nome.trim(), cidade || null, estado || null, observacoes || null],
  )
  return Response.json(result.rows[0], { status: 201 })
}, { adminOnly: true })
