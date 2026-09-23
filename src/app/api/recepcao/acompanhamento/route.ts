import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, ApiError } from '@/lib/api'
import { forbidden } from '@/lib/auth'
import { membroAcessivel } from '@/lib/access'

const CAMPOS = [
  ['contato_feito', 'bool'],
  ['contato_por', 'text'],
  ['contato_data', 'date'],
  ['visita_agendada', 'bool'],
  ['visita_agendada_por', 'text'],
  ['visita_casa_data', 'date'],
  ['visita_casa_feita', 'bool'],
  ['voltou_culto', 'bool'],
  ['voltou_culto_data', 'date'],
  ['discipulado', 'bool'],
  ['discipulado_inicio', 'date'],
  ['discipulador', 'text'],
  ['batizado', 'bool'],
  ['congregacao_origem', 'text'],
  ['convidado_por', 'text'],
  ['observacoes', 'text'],
] as const

/**
 * PUT /api/recepcao/acompanhamento
 * Upsert do checklist/acompanhamento de um visitante. Envie o objeto completo.
 */
export const PUT = withAuth(async (req: NextRequest, user) => {
  const b = await req.json()
  const membroId = Number(b.membro_id)
  if (!membroId) throw new ApiError(400, 'membro_id é obrigatório.')

  if (!(await membroAcessivel(user, membroId, pool))) {
    return forbidden('Este visitante não está no seu escopo de acesso.')
  }

  const valores = CAMPOS.map(([k, tipo]) => {
    const v = b[k]
    if (tipo === 'bool') return v === true
    return (typeof v === 'string' ? v.trim() : v) || null
  })

  const cols = CAMPOS.map(([k]) => k)
  const placeholders = cols.map((_, i) => `$${i + 2}`).join(', ')
  const setClause = cols.map(k => `${k} = EXCLUDED.${k}`).join(', ')

  await pool.query(
    `INSERT INTO acompanhamento_visitante (membro_id, ${cols.join(', ')}, updated_at)
     VALUES ($1, ${placeholders}, NOW())
     ON CONFLICT (membro_id) DO UPDATE SET ${setClause}, updated_at = NOW()`,
    [membroId, ...valores],
  )
  return Response.json({ message: 'Acompanhamento salvo.' })
}, { permission: 'recepcao' })
