import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, parseBody, ApiError } from '@/lib/api'
import { assertCongregacaoNoEscopoDb, congregacoesEfetivas } from '@/lib/scope'
import {
  ofertaSchema, salvarOferta, lerOferta, registrarAuditoria,
  podeLancar, podeVerOfertas, podeEditarQualquer, podeAcessarOfertas, podeEditarOferta,
} from '@/lib/ofertas'

/**
 * GET  ?mes=YYYY-MM&congregacao=ID  lançamentos do mês (quem só lança vê apenas os seus)
 * POST                               novo lançamento
 */
export const GET = withAuth(async (req: NextRequest, user) => {
  if (!podeAcessarOfertas(user)) throw new ApiError(403, 'Você não tem acesso às ofertas.')
  const sp = new URL(req.url).searchParams

  const mes = sp.get('mes') ?? new Date().toISOString().slice(0, 7)
  if (!/^\d{4}-\d{2}$/.test(mes)) throw new ApiError(400, 'Mês inválido.')

  const params: unknown[] = [`${mes}-01`]
  let where = `o.data_culto >= $1::date AND o.data_culto < ($1::date + interval '1 month')`

  const congParam = sp.get('congregacao')
  if (congParam) {
    const congId = Number(congParam)
    await assertCongregacaoNoEscopoDb(user, congId, pool)
    params.push(congId)
    where += ` AND o.congregacao_id = $${params.length}`
  } else {
    const efetivas = await congregacoesEfetivas(user, pool)
    if (efetivas) {
      if (efetivas.length === 0) return Response.json({ lancamentos: [] })
      params.push(efetivas)
      where += ` AND o.congregacao_id = ANY($${params.length}::int[])`
    }
  }

  // Quem só lança (sem ver/editar) enxerga apenas os próprios lançamentos.
  if (!podeVerOfertas(user) && !podeEditarQualquer(user)) {
    params.push(user.id)
    where += ` AND o.lancado_por = $${params.length}`
  }

  const { rows } = await pool.query(
    `SELECT o.id, o.congregacao_id, c.nome AS congregacao_nome, o.data_culto, o.culto_nome,
            o.dizimos, o.ofertas, o.missoes, o.outros,
            (o.dizimos + o.ofertas + o.missoes + o.outros) AS total,
            o.lancado_por, u.nome AS lancado_por_nome, o.created_at, o.updated_at,
            COALESCE(i.qtd, 0)::int AS qtd_itens, COALESCE(i.soma, 0) AS valor_detalhado
     FROM ofertas o
     JOIN congregacoes c ON c.id = o.congregacao_id
     LEFT JOIN usuarios u ON u.id = o.lancado_por
     LEFT JOIN (
       SELECT oferta_id, COUNT(*) AS qtd, SUM(valor) AS soma FROM oferta_itens GROUP BY oferta_id
     ) i ON i.oferta_id = o.id
     WHERE ${where}
     ORDER BY o.data_culto DESC, o.created_at DESC`,
    params,
  )

  return Response.json({
    lancamentos: rows.map(r => ({ ...r, pode_editar: podeEditarOferta(user, r) })),
  })
})

export const POST = withAuth(async (req: NextRequest, user) => {
  if (!podeLancar(user)) throw new ApiError(403, 'Você não tem permissão para lançar ofertas.')
  const body = await parseBody(req, ofertaSchema)
  await assertCongregacaoNoEscopoDb(user, body.congregacao_id, pool)

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const id = await salvarOferta(client, user, null, body)
    await registrarAuditoria(client, user, id, 'criar', null, await lerOferta(client, id))
    await client.query('COMMIT')
    return Response.json({ message: 'Oferta lançada!', id }, { status: 201 })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
})
