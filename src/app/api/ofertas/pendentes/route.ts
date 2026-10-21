import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, ApiError } from '@/lib/api'
import { assertCongregacaoNoEscopoDb, congregacoesEfetivas } from '@/lib/scope'
import { podeVerPendentes } from '@/lib/ofertas'

/** Pessoas que ofertaram sem cadastro. ?status=pendente|cadastrado|descartado|todos */
export const GET = withAuth(async (req: NextRequest, user) => {
  if (!podeVerPendentes(user)) throw new ApiError(403, 'Você não tem acesso a esta lista.')
  const sp = new URL(req.url).searchParams

  const params: unknown[] = []
  const conds: string[] = []

  const status = sp.get('status') ?? 'pendente'
  if (status !== 'todos') {
    if (!['pendente', 'cadastrado', 'descartado'].includes(status)) throw new ApiError(400, 'Status inválido.')
    params.push(status)
    conds.push(`p.status = $${params.length}`)
  }

  const congParam = sp.get('congregacao')
  if (congParam) {
    const congId = Number(congParam)
    await assertCongregacaoNoEscopoDb(user, congId, pool)
    params.push(congId)
    conds.push(`p.congregacao_id = $${params.length}`)
  } else {
    const efetivas = await congregacoesEfetivas(user, pool)
    if (efetivas) {
      if (efetivas.length === 0) return Response.json([])
      params.push(efetivas)
      conds.push(`p.congregacao_id = ANY($${params.length}::int[])`)
    }
  }

  // Sem valores: a lista serve para cadastro, não expõe quanto cada um deu.
  const { rows } = await pool.query(
    `SELECT p.id, p.nome, p.telefone, p.status, p.created_at, p.resolvido_em,
            p.congregacao_id, c.nome AS congregacao_nome,
            p.membro_id, m.nome AS membro_nome,
            COUNT(DISTINCT i.oferta_id)::int AS qtd_lancamentos,
            MAX(o.data_culto) AS ultimo_culto
     FROM pessoas_pendentes p
     JOIN congregacoes c ON c.id = p.congregacao_id
     LEFT JOIN membros m ON m.id = p.membro_id
     LEFT JOIN oferta_itens i ON i.pessoa_pendente_id = p.id
     LEFT JOIN ofertas o ON o.id = i.oferta_id
     ${conds.length ? `WHERE ${conds.join(' AND ')}` : ''}
     GROUP BY p.id, c.nome, m.nome
     ORDER BY p.status = 'pendente' DESC, p.created_at DESC
     LIMIT 500`,
    params,
  )
  return Response.json(rows)
})
