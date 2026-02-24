import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { verificarToken, unauthorized } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  const { senhaAtual, novaSenha } = await req.json()

  if (!senhaAtual || !novaSenha) {
    return Response.json({ error: 'Senha atual e nova senha são obrigatórias' }, { status: 400 })
  }

  try {
    const result = await pool.query('SELECT senha FROM usuarios WHERE id = $1', [user.id])
    const senhaValida = await bcrypt.compare(senhaAtual, result.rows[0].senha)

    if (!senhaValida) {
      return Response.json({ error: 'Senha atual incorreta' }, { status: 401 })
    }

    const senhaCriptografada = await bcrypt.hash(novaSenha, 10)
    await pool.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [senhaCriptografada, user.id])

    return Response.json({ message: 'Senha alterada com sucesso' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
