import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { withAuth, ApiError } from '@/lib/api'

export const GET = withAuth(async () => {
  const result = await pool.query(
    `SELECT u.id, u.nome, u.email, u.tipo, u.ativo, u.created_at, u.ultimo_acesso,
            u.perfil_id, u.departamentos_acesso, u.congregacoes_acesso, pa.nome as perfil_nome
     FROM usuarios u
     LEFT JOIN perfis_acesso pa ON u.perfil_id = pa.id
     ORDER BY u.nome`,
  )
  return Response.json(result.rows)
}, { adminOnly: true })

export const POST = withAuth(async (req: NextRequest) => {
  const { nome, email, senha, tipo, perfil_id, departamentos_acesso, congregacoes_acesso } = await req.json()
  if (!nome || !email || !senha) throw new ApiError(400, 'Nome, email e senha são obrigatórios')

  const deptAcesso = Array.isArray(departamentos_acesso) && departamentos_acesso.length > 0 ? departamentos_acesso : null
  const congAcesso = Array.isArray(congregacoes_acesso) && congregacoes_acesso.length > 0 ? congregacoes_acesso : null

  const senhaCriptografada = await bcrypt.hash(senha, 10)
  const result = await pool.query(
    `INSERT INTO usuarios (nome, email, senha, tipo, perfil_id, departamentos_acesso, congregacoes_acesso)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [nome, email, senhaCriptografada, tipo || 'usuario', perfil_id || null, deptAcesso, congAcesso],
  )
  return Response.json({ id: result.rows[0].id, message: 'Usuário criado com sucesso' })
}, { adminOnly: true })
