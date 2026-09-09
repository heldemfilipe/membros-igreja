import pool from '@/lib/db'
import { withAuthParams, ApiError } from '@/lib/api'
import { forbidden } from '@/lib/auth'
import { membroAcessivel } from '@/lib/access'

/**
 * DELETE /api/recepcao/visitante/[id]
 * Remove um VISITANTE (e suas visitas / acompanhamento, via ON DELETE CASCADE).
 * Só funciona para tipo_participante = 'Visitante' e dentro do escopo do usuário.
 */
export const DELETE = withAuthParams<{ id: string }>(async (_req, user, { params }) => {
  const { id } = params

  if (!(await membroAcessivel(user, id, pool))) {
    return forbidden('Este visitante não está no seu escopo de acesso.')
  }

  const r = await pool.query('SELECT tipo_participante FROM membros WHERE id = $1', [id])
  if (r.rows.length === 0) throw new ApiError(404, 'Visitante não encontrado.')
  if (r.rows[0].tipo_participante !== 'Visitante') {
    throw new ApiError(400, 'Só é possível remover registros de visitante por aqui.')
  }

  await pool.query('DELETE FROM membros WHERE id = $1', [id])
  return Response.json({ message: 'Visitante removido.' })
}, { permission: 'recepcao' })
