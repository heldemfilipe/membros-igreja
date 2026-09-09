import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { withAuth, ApiError } from '@/lib/api'

export const POST = withAuth(async (req: NextRequest, user) => {
  const { senhaAtual, novaSenha } = await req.json()

  if (!senhaAtual || !novaSenha) {
    throw new ApiError(400, 'Senha atual e nova senha são obrigatórias')
  }
  if (typeof novaSenha !== 'string' || novaSenha.length < 6) {
    throw new ApiError(400, 'A nova senha deve ter pelo menos 6 caracteres')
  }
  if (novaSenha === senhaAtual) {
    throw new ApiError(400, 'A nova senha deve ser diferente da senha atual')
  }

  const result = await pool.query('SELECT senha FROM usuarios WHERE id = $1', [user.id])
  const senhaValida = await bcrypt.compare(senhaAtual, result.rows[0].senha)
  if (!senhaValida) {
    throw new ApiError(401, 'Senha atual incorreta')
  }

  const senhaCriptografada = await bcrypt.hash(novaSenha, 10)
  await pool.query(
    `UPDATE usuarios
     SET senha = $1, deve_trocar_senha = FALSE, senha_alterada_em = NOW()
     WHERE id = $2`,
    [senhaCriptografada, user.id],
  )

  return Response.json({ message: 'Senha alterada com sucesso' })
})
