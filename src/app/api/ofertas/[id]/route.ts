import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuthParams, parseBody, ApiError } from '@/lib/api'
import type { AuthUser } from '@/lib/auth'
import { notFound } from '@/lib/auth'
import { assertCongregacaoNoEscopoDb } from '@/lib/scope'
import {
  ofertaSchema, salvarOferta, lerOferta, registrarAuditoria,
  podeVerOfertas, podeEditarQualquer, podeAcessarOfertas, podeEditarOferta, podeVerDetalhe,
} from '@/lib/ofertas'

type Oferta = NonNullable<Awaited<ReturnType<typeof lerOferta>>>

/** Carrega a oferta e garante que o usuário pode enxergá-la (404 se não). */
async function carregarVisivel(user: AuthUser, id: string): Promise<Oferta> {
  if (!podeAcessarOfertas(user)) throw new ApiError(403, 'Você não tem acesso às ofertas.')
  const oferta = Number.isInteger(Number(id)) ? await lerOferta(pool, Number(id)) : null
  if (!oferta) throw new ApiError(404, 'Lançamento não encontrado.')
  await assertCongregacaoNoEscopoDb(user, oferta.congregacao_id, pool)
  const proprio = oferta.lancado_por === user.id
  if (!proprio && !podeVerOfertas(user) && !podeEditarQualquer(user)) throw new ApiError(404, 'Lançamento não encontrado.')
  return oferta
}

export const GET = withAuthParams<{ id: string }>(async (_req, user, { params }) => {
  const oferta = await carregarVisivel(user, params.id)
  // O detalhe por pessoa é mais sensível que o total: só quem tem a permissão
  // ou quem fez o lançamento (precisa ver para corrigir).
  const verItens = podeVerDetalhe(user) || oferta.lancado_por === user.id
  const historico = await pool.query(
    `SELECT acao, usuario_nome, created_at FROM ofertas_auditoria
     WHERE oferta_id = $1 ORDER BY created_at`,
    [oferta.id],
  )
  return Response.json({
    ...oferta,
    itens: verItens ? oferta.itens : null,
    pode_editar: podeEditarOferta(user, oferta),
    historico: historico.rows,
  })
})

export const PUT = withAuthParams<{ id: string }>(async (req: NextRequest, user, { params }) => {
  const atual = await carregarVisivel(user, params.id)
  if (!podeEditarOferta(user, atual)) {
    throw new ApiError(403, 'O prazo para corrigir este lançamento acabou. Peça a quem tem permissão de editar ofertas.')
  }
  let body = await parseBody(req, ofertaSchema)
  await assertCongregacaoNoEscopoDb(user, body.congregacao_id, pool)

  // Quem não vê o detalhe por pessoa não pode reescrevê-lo às cegas: os itens
  // atuais são mantidos e revalidados contra os novos totais.
  if (!podeVerDetalhe(user) && atual.lancado_por !== user.id) {
    const mantidos = atual.itens.map((it: { tipo: string; valor: string; membro_id: number | null; pessoa_pendente_id: number | null }) => ({
      tipo: it.tipo,
      valor: Math.round(Number(it.valor) * 100),
      membro_id: it.membro_id,
      pessoa_pendente_id: it.membro_id ? null : it.pessoa_pendente_id,
    }))
    const r = ofertaSchema.safeParse({ ...body, itens: mantidos })
    if (!r.success) throw new ApiError(400, r.error.issues.map(i => i.message).join('; '))
    body = r.data
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await salvarOferta(client, user, atual.id, body)
    await registrarAuditoria(client, user, atual.id, 'editar', atual, await lerOferta(client, atual.id))
    await client.query('COMMIT')
    return Response.json({ message: 'Lançamento atualizado!' })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
})

export const DELETE = withAuthParams<{ id: string }>(async (_req, user, { params }) => {
  const atual = await carregarVisivel(user, params.id)
  if (!podeEditarQualquer(user)) throw new ApiError(403, 'Só quem tem permissão de editar ofertas pode excluir.')

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await registrarAuditoria(client, user, atual.id, 'excluir', atual, null)
    const r = await client.query('DELETE FROM ofertas WHERE id = $1', [atual.id])
    if (r.rowCount === 0) { await client.query('ROLLBACK'); return notFound('Lançamento não encontrado.') }
    await client.query('COMMIT')
    return Response.json({ message: 'Lançamento excluído.' })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
})
