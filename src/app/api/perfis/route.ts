import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized, forbidden } from '@/lib/auth'

// Garante que as tabelas e colunas necessárias existam
async function ensureSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS perfis_acesso (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(100) NOT NULL UNIQUE,
        descricao TEXT,
        permissoes JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `)
    await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil_id INTEGER REFERENCES perfis_acesso(id) ON DELETE SET NULL`)
    await pool.query(`ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS departamentos_acesso INTEGER[]`)
  } catch {
    // ignora se já existir ou sem permissão
  }
}

export async function GET(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()
  if (user.tipo !== 'admin') return forbidden()

  await ensureSchema()

  try {
    const result = await pool.query(
      'SELECT id, nome, descricao, permissoes, created_at FROM perfis_acesso ORDER BY nome'
    )
    return Response.json(result.rows)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()
  if (user.tipo !== 'admin') return forbidden()

  await ensureSchema()

  const { nome, descricao, permissoes } = await req.json()

  if (!nome?.trim()) {
    return Response.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }

  try {
    const result = await pool.query(
      'INSERT INTO perfis_acesso (nome, descricao, permissoes) VALUES ($1, $2, $3) RETURNING id',
      [nome.trim(), descricao || null, JSON.stringify(permissoes || {})]
    )
    return Response.json({ id: result.rows[0].id, message: 'Perfil criado com sucesso' })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === '23505') {
      return Response.json({ error: 'Já existe um perfil com este nome' }, { status: 400 })
    }
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
