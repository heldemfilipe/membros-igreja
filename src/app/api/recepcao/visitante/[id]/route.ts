import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuthParams, ApiError } from '@/lib/api'
import { forbidden } from '@/lib/auth'
import { membroAcessivel } from '@/lib/access'
import { toNull } from '@/lib/utils'

/**
 * PATCH /api/recepcao/visitante/[id]
 * Edita dados básicos de um VISITANTE a partir da tela de Recepção.
 */
export const PATCH = withAuthParams<{ id: string }>(async (req: NextRequest, user, { params }) => {
  const { id } = params
  if (!(await membroAcessivel(user, id, pool))) {
    return forbidden('Este visitante não está no seu escopo de acesso.')
  }
  const tipo = await pool.query('SELECT tipo_participante FROM membros WHERE id = $1', [id])
  if (tipo.rows.length === 0) throw new ApiError(404, 'Visitante não encontrado.')
  if (tipo.rows[0].tipo_participante !== 'Visitante') {
    throw new ApiError(400, 'Este cadastro não é mais um visitante — edite pela ficha de membros.')
  }

  const b = await req.json()
  const nome = (b.nome || '').trim()
  if (!nome) throw new ApiError(400, 'O nome não pode ficar em branco.')

  await pool.query(
    `UPDATE membros
     SET nome = $1, telefone_principal = $2, email = $3,
         data_nascimento = $4, informacoes_complementares = $5,
         origem_religiosa = $6, origem_religiosa_detalhe = $7
     WHERE id = $8`,
    [
      nome,
      toNull((b.telefone_principal || '').trim()),
      toNull((b.email || '').trim()),
      toNull((b.data_nascimento || '').trim()),
      toNull((b.informacoes_complementares || '').trim()),
      toNull((b.origem_religiosa || '').trim()),
      toNull((b.origem_religiosa_detalhe || '').trim()),
      id,
    ],
  )
  return Response.json({ message: 'Dados do visitante atualizados.' })
}, { permission: 'recepcao' })

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
