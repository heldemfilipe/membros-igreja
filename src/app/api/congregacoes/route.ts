import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, ApiError } from '@/lib/api'

export const GET = withAuth(async (_req, user) => {
  // Restrição por congregações
  const congAcesso = user.congregacoes_acesso?.length ? user.congregacoes_acesso : null

  const params: unknown[] = []
  const congWhere = congAcesso ? `WHERE c.id = ANY($1::int[])` : ''
  if (congAcesso) params.push(congAcesso)

  const result = await pool.query(`
    SELECT c.id, c.nome, c.cidade, c.estado, c.observacoes,
      COUNT(m.id)::int AS total_membros
    FROM congregacoes c
    LEFT JOIN membros m ON m.igreja = c.nome
    ${congWhere}
    GROUP BY c.id, c.nome, c.cidade, c.estado, c.observacoes
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
}, { permission: 'congregacoes_editar' })
