import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, ApiError } from '@/lib/api'
import { forbidden } from '@/lib/auth'
import { membroAcessivel } from '@/lib/access'

/**
 * PUT /api/recepcao/acompanhamento
 * Upsert do checklist de um visitante.
 * Body: { membro_id, voltou_culto, visita_casa_data, visita_casa_feita,
 *         discipulado, discipulador, observacoes }
 */
export const PUT = withAuth(async (req: NextRequest, user) => {
  const b = await req.json()
  const membroId = Number(b.membro_id)
  if (!membroId) throw new ApiError(400, 'membro_id é obrigatório.')

  if (!(await membroAcessivel(user, membroId, pool))) {
    return forbidden('Este visitante não está no seu escopo de acesso.')
  }

  await pool.query(
    `INSERT INTO acompanhamento_visitante
       (membro_id, voltou_culto, voltou_culto_data, visita_casa_data, visita_casa_feita, discipulado, discipulador, observacoes, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW())
     ON CONFLICT (membro_id) DO UPDATE SET
       voltou_culto      = EXCLUDED.voltou_culto,
       voltou_culto_data = EXCLUDED.voltou_culto_data,
       visita_casa_data  = EXCLUDED.visita_casa_data,
       visita_casa_feita = EXCLUDED.visita_casa_feita,
       discipulado       = EXCLUDED.discipulado,
       discipulador      = EXCLUDED.discipulador,
       observacoes       = EXCLUDED.observacoes,
       updated_at        = NOW()`,
    [
      membroId,
      b.voltou_culto === true,
      b.voltou_culto_data || null,
      b.visita_casa_data || null,
      b.visita_casa_feita === true,
      b.discipulado === true,
      (b.discipulador || '').trim() || null,
      (b.observacoes || '').trim() || null,
    ],
  )
  return Response.json({ message: 'Acompanhamento salvo.' })
}, { permission: 'recepcao' })
