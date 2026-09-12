import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth } from '@/lib/api'
import { congregacoesEfetivas } from '@/lib/scope'

/**
 * GET /api/cadastros-publicos?status=pendente&congregacao=N
 * Lista os autocadastros vindos do link público, escopados pela(s)
 * congregação(ões) do usuário — igual às outras listagens da recepção —
 * e, se informado, pelo filtro de congregação da tela (ex.: o seletor
 * "Visualizando" da barra lateral).
 */
export const GET = withAuth(async (req: NextRequest, user) => {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'pendente'
  const congregacaoParam = searchParams.get('congregacao')

  const efetivas = await congregacoesEfetivas(user, pool)
  // Combina a restrição de acesso do usuário com o filtro voluntário da
  // tela num único array (mesmo padrão de buildAccessWhere).
  const effectiveCong = efetivas
    ? (congregacaoParam ? efetivas.filter(id => id === parseInt(congregacaoParam)) : efetivas)
    : (congregacaoParam ? [parseInt(congregacaoParam)] : null)

  const params: unknown[] = [status]
  let where = 'WHERE cp.status = $1'
  if (effectiveCong) {
    if (effectiveCong.length === 0) return Response.json([])
    params.push(effectiveCong)
    where += ` AND cp.congregacao_id = ANY($${params.length}::int[])`
  }

  const result = await pool.query(
    `SELECT cp.*, c.nome AS congregacao_nome
     FROM cadastros_publicos cp
     LEFT JOIN congregacoes c ON c.id = cp.congregacao_id
     ${where}
     ORDER BY cp.created_at DESC`,
    params,
  )
  return Response.json(result.rows)
}, { permission: 'recepcao' })
