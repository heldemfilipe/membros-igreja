import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized } from '@/lib/auth'

async function criarTabela() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS congregacoes (
      id SERIAL PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      cidade VARCHAR(255),
      estado VARCHAR(2),
      observacoes TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `)
}

export async function GET(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  try {
    await criarTabela()
    const result = await pool.query(`
      SELECT c.id, c.nome, c.cidade, c.estado, c.observacoes,
        COUNT(m.id)::int AS total_membros
      FROM congregacoes c
      LEFT JOIN membros m ON m.igreja = c.nome
      GROUP BY c.id, c.nome, c.cidade, c.estado, c.observacoes
      ORDER BY c.nome
    `)
    return Response.json(result.rows)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  const { nome, cidade, estado, observacoes } = await req.json()
  if (!nome?.trim()) {
    return Response.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  }

  try {
    await criarTabela()
    const result = await pool.query(
      'INSERT INTO congregacoes (nome, cidade, estado, observacoes) VALUES ($1,$2,$3,$4) RETURNING *',
      [nome.trim(), cidade || null, estado || null, observacoes || null]
    )
    return Response.json(result.rows[0], { status: 201 })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
