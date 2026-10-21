import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, ApiError } from '@/lib/api'
import { assertCongregacaoNoEscopoDb } from '@/lib/scope'
import { podeLancar } from '@/lib/ofertas'

/**
 * Busca de pessoas para o detalhe da oferta: cadastrados ativos da
 * congregação + pessoas já pendentes de cadastro. Devolve só id/nome, para
 * quem lança não precisar da permissão de ver membros.
 */
export const GET = withAuth(async (req: NextRequest, user) => {
  if (!podeLancar(user)) throw new ApiError(403, 'Você não tem permissão para lançar ofertas.')
  const sp = new URL(req.url).searchParams
  const congId = Number(sp.get('congregacao'))
  if (!Number.isInteger(congId) || congId <= 0) throw new ApiError(400, 'Informe a congregação.')
  await assertCongregacaoNoEscopoDb(user, congId, pool)

  const q = (sp.get('q') ?? '').trim()
  if (q.length < 2) return Response.json({ membros: [], pendentes: [] })
  const like = `%${q.replace(/[%_\\]/g, '\\$&')}%`

  const [membros, pendentes] = await Promise.all([
    pool.query(
      `SELECT m.id, m.nome, m.conhecido_como, m.tipo_participante
       FROM membros m JOIN congregacoes c ON c.nome = m.igreja
       WHERE c.id = $1 AND m.ativo IS NOT FALSE
         AND (m.nome ILIKE $2 OR m.conhecido_como ILIKE $2)
       ORDER BY m.nome LIMIT 10`,
      [congId, like],
    ),
    pool.query(
      `SELECT id, nome, telefone FROM pessoas_pendentes
       WHERE congregacao_id = $1 AND status = 'pendente' AND nome ILIKE $2
       ORDER BY nome LIMIT 5`,
      [congId, like],
    ),
  ])
  return Response.json({ membros: membros.rows, pendentes: pendentes.rows })
})
