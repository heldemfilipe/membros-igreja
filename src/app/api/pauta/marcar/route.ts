import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, ApiError } from '@/lib/api'
import { assertCongregacaoNoEscopoDb } from '@/lib/scope'
import { hojeISO, isISO, segundaFeira } from '@/lib/semana'

/**
 * POST /api/pauta/marcar
 * Marca/desmarca um item AUTOMÁTICO (aniversário ou bodas de quem já está
 * cadastrado). Como esses itens são recalculados a cada abertura da tela,
 * aqui guardamos só o "check" daquela semana. Desmarcar apaga a linha.
 *
 * Body: { congregacao_id, semana_inicio, chave, concluido }
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json().catch(() => ({}))

  const congId = Number(body.congregacao_id)
  if (!Number.isFinite(congId)) throw new ApiError(400, 'Informe a congregação.')
  await assertCongregacaoNoEscopoDb(user, congId, pool)

  const chave = String(body.chave || '')
  if (!/^(aniversario|bodas):\d+$/.test(chave)) throw new ApiError(400, 'Item inválido.')

  const semanaInicio = segundaFeira(isISO(body.semana_inicio) ? body.semana_inicio : hojeISO())
  const concluido = body.concluido !== false

  if (!concluido) {
    await pool.query(
      'DELETE FROM pauta_marcacoes WHERE congregacao_id = $1 AND semana_inicio = $2 AND chave = $3',
      [congId, semanaInicio, chave],
    )
    return Response.json({ chave, concluido: false })
  }

  await pool.query(
    `INSERT INTO pauta_marcacoes (congregacao_id, semana_inicio, chave, concluido, marcado_por)
     VALUES ($1,$2,$3,TRUE,$4)
     ON CONFLICT (congregacao_id, semana_inicio, chave)
     DO UPDATE SET concluido = TRUE, concluido_em = NOW(), marcado_por = EXCLUDED.marcado_por`,
    [congId, semanaInicio, chave, user.id],
  )
  return Response.json({ chave, concluido: true })
}, { permission: 'pauta_editar' })
