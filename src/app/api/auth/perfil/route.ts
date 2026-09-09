import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, ApiError } from '@/lib/api'

/**
 * PATCH /api/auth/perfil
 * O próprio usuário atualiza dados básicos da sua conta.
 * Por enquanto: apenas o nome. E-mail (login), tipo, perfil e escopo de
 * acesso continuam sob controle exclusivo de um administrador.
 */
export const PATCH = withAuth(async (req: NextRequest, user) => {
  const body = await req.json().catch(() => ({}))
  const nome = typeof body.nome === 'string' ? body.nome.trim() : ''

  if (!nome) throw new ApiError(400, 'O nome não pode ficar em branco')
  if (nome.length > 255) throw new ApiError(400, 'Nome muito longo')

  const result = await pool.query(
    'UPDATE usuarios SET nome = $1 WHERE id = $2 RETURNING id, nome, email, tipo',
    [nome, user.id],
  )
  return Response.json({ message: 'Conta atualizada', usuario: result.rows[0] })
})
