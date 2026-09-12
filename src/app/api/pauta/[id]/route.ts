import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuthParams, ApiError } from '@/lib/api'
import { notFound } from '@/lib/auth'
import { assertCongregacaoNoEscopoDb } from '@/lib/scope'
import { addDias, isISO } from '@/lib/semana'

const RETORNO = `id, congregacao_id, semana_inicio::text AS semana_inicio, tipo, titulo,
                 descricao, data_referencia::text AS data_referencia, telefone,
                 concluido, concluido_em, adiado_de::text AS adiado_de, created_at`

async function carregarItem(id: string, user: Parameters<typeof assertCongregacaoNoEscopoDb>[0]) {
  const { rows } = await pool.query(
    'SELECT id, congregacao_id, semana_inicio::text AS semana_inicio FROM pauta_itens WHERE id = $1',
    [id],
  )
  if (rows.length === 0) return null
  await assertCongregacaoNoEscopoDb(user, rows[0].congregacao_id, pool)
  return rows[0] as { id: number; congregacao_id: number; semana_inicio: string }
}

/**
 * PATCH /api/pauta/[id]
 *  - { acao: 'adiar' }        → empurra o item para a semana seguinte
 *  - { concluido: boolean }   → marca/desmarca como resolvido
 *  - { titulo, descricao, data_referencia, telefone } → edita o texto
 */
export const PATCH = withAuthParams<{ id: string }>(async (req, user, { params }) => {
  const item = await carregarItem(params.id, user)
  if (!item) return notFound('Item da pauta não encontrado.')

  const body = await req.json().catch(() => ({}))

  // Adiar: sai desta semana e reaparece na seguinte, ainda em aberto.
  if (body.acao === 'adiar') {
    const { rows } = await pool.query(
      `UPDATE pauta_itens
          SET semana_inicio = $1, adiado_de = $2, concluido = FALSE, concluido_em = NULL, updated_at = NOW()
        WHERE id = $3
      RETURNING ${RETORNO}`,
      [addDias(item.semana_inicio, 7), item.semana_inicio, params.id],
    )
    return Response.json(rows[0])
  }

  const sets: string[] = []
  const valores: unknown[] = []
  const set = (coluna: string, valor: unknown) => {
    valores.push(valor)
    sets.push(`${coluna} = $${valores.length}`)
  }

  if (typeof body.concluido === 'boolean') {
    set('concluido', body.concluido)
    set('concluido_em', body.concluido ? new Date().toISOString() : null)
  }
  if (typeof body.titulo === 'string') {
    const titulo = body.titulo.trim()
    if (!titulo) throw new ApiError(400, 'O item não pode ficar sem texto.')
    set('titulo', titulo)
  }
  if (typeof body.descricao === 'string') set('descricao', body.descricao.trim() || null)
  if (typeof body.telefone === 'string') set('telefone', body.telefone.trim() || null)
  if (body.data_referencia !== undefined) {
    set('data_referencia', isISO(body.data_referencia) ? body.data_referencia : null)
  }

  if (sets.length === 0) throw new ApiError(400, 'Nada para alterar.')

  valores.push(params.id)
  const { rows } = await pool.query(
    `UPDATE pauta_itens SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${valores.length}
    RETURNING ${RETORNO}`,
    valores,
  )
  return Response.json(rows[0])
}, { permission: 'pauta_editar' })

export const DELETE = withAuthParams<{ id: string }>(async (_req, user, { params }) => {
  const item = await carregarItem(params.id, user)
  if (!item) return notFound('Item da pauta não encontrado.')
  await pool.query('DELETE FROM pauta_itens WHERE id = $1', [params.id])
  return Response.json({ message: 'Item removido da pauta.' })
}, { permission: 'pauta_editar' })
