import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { verificarToken, unauthorized, forbidden } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()
  if (user.tipo !== 'admin') return forbidden()

  try {
    const result = await pool.query(
      `SELECT u.id, u.nome, u.email, u.tipo, u.ativo, u.created_at, u.ultimo_acesso,
              u.perfil_id, u.departamentos_acesso, pa.nome as perfil_nome
       FROM usuarios u
       LEFT JOIN perfis_acesso pa ON u.perfil_id = pa.id
       ORDER BY u.nome`
    )
    return Response.json(result.rows)
  } catch {
    // Fallback sem colunas de perfil (antes da migração)
    try {
      const result = await pool.query(
        'SELECT id, nome, email, tipo, ativo, created_at, ultimo_acesso FROM usuarios ORDER BY nome'
      )
      return Response.json(result.rows)
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido'
      return Response.json({ error: msg }, { status: 500 })
    }
  }
}

export async function POST(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()
  if (user.tipo !== 'admin') return forbidden()

  const { nome, email, senha, tipo, perfil_id } = await req.json()

  if (!nome || !email || !senha) {
    return Response.json({ error: 'Nome, email e senha são obrigatórios' }, { status: 400 })
  }

  try {
    const senhaCriptografada = await bcrypt.hash(senha, 10)
    let result
    try {
      result = await pool.query(
        `INSERT INTO usuarios (nome, email, senha, tipo, perfil_id)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [nome, email, senhaCriptografada, tipo || 'usuario', perfil_id || null]
      )
    } catch {
      // Fallback sem perfil_id
      result = await pool.query(
        'INSERT INTO usuarios (nome, email, senha, tipo) VALUES ($1, $2, $3, $4) RETURNING id',
        [nome, email, senhaCriptografada, tipo || 'usuario']
      )
    }
    return Response.json({ id: result.rows[0].id, message: 'Usuário criado com sucesso' })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === '23505') {
      return Response.json({ error: 'Email já cadastrado' }, { status: 400 })
    }
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
