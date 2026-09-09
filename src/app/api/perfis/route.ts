import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, ApiError } from '@/lib/api'
import {
  escopoCongregacoes,
  assertPerfilGerenciavel,
  limitarPermissoesAoQueUsuarioTem,
} from '@/lib/scope'

const SELECT = `p.id, p.nome, p.descricao, p.permissoes, p.congregacao_id,
       c.nome AS congregacao_nome, p.created_at`

// GET /api/perfis
// admin  → todos os perfis (globais + de todas as congregações)
// gestor → perfis globais + os da(s) sua(s) congregação(ões)
export const GET = withAuth(async (_req, user) => {
  const escopo = user.tipo === 'admin' ? null : escopoCongregacoes(user)

  const where = escopo ? 'WHERE p.congregacao_id IS NULL OR p.congregacao_id = ANY($1::int[])' : ''
  const result = await pool.query(
    `SELECT ${SELECT}
     FROM perfis_acesso p
     LEFT JOIN congregacoes c ON p.congregacao_id = c.id
     ${where}
     ORDER BY p.congregacao_id NULLS FIRST, p.nome`,
    escopo ? [escopo] : [],
  )
  return Response.json(result.rows)
}, { permissionStrict: 'usuarios_gerenciar' })

// POST /api/perfis
export const POST = withAuth(async (req: NextRequest, user) => {
  const { nome, descricao, permissoes, congregacao_id } = await req.json()
  if (!nome?.trim()) throw new ApiError(400, 'Nome é obrigatório')

  let congregacaoId: number | null = congregacao_id != null && congregacao_id !== ''
    ? Number(congregacao_id)
    : null

  if (user.tipo !== 'admin') {
    const escopo = escopoCongregacoes(user)
    // Gestor com uma única congregação: assume ela por padrão.
    if (congregacaoId == null && escopo && escopo.length === 1) congregacaoId = escopo[0]
    assertPerfilGerenciavel(user, congregacaoId) // rejeita null (global) e fora do escopo
  }

  const permissoesFinais = limitarPermissoesAoQueUsuarioTem(user, permissoes)

  const result = await pool.query(
    'INSERT INTO perfis_acesso (nome, descricao, permissoes, congregacao_id) VALUES ($1, $2, $3, $4) RETURNING id',
    [nome.trim(), descricao || null, JSON.stringify(permissoesFinais), congregacaoId],
  )
  return Response.json({ id: result.rows[0].id, message: 'Perfil criado com sucesso' })
}, { permissionStrict: 'usuarios_gerenciar' })
