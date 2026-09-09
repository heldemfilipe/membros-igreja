import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { withAuth, ApiError } from '@/lib/api'
import {
  escopoCongregacoes,
  departamentosPermitidos,
  sanitizarAcessoDeGestor,
  assertPerfilAtribuivel,
} from '@/lib/scope'

const SELECT_COLS = `u.id, u.nome, u.email, u.tipo, u.ativo, u.created_at, u.ultimo_acesso,
       u.perfil_id, u.departamentos_acesso, u.congregacoes_acesso,
       u.deve_trocar_senha, u.senha_alterada_em, pa.nome as perfil_nome`

export const GET = withAuth(async (_req, user) => {
  // Admin vê todos. Gestor (não-admin) vê apenas usuários da(s) sua(s)
  // congregação(ões) — nunca admins — mais o próprio usuário.
  if (user.tipo === 'admin') {
    const result = await pool.query(
      `SELECT ${SELECT_COLS}
       FROM usuarios u
       LEFT JOIN perfis_acesso pa ON u.perfil_id = pa.id
       ORDER BY u.nome`,
    )
    return Response.json(result.rows)
  }

  const escopo = escopoCongregacoes(user)
  const result = await pool.query(
    `SELECT ${SELECT_COLS}
     FROM usuarios u
     LEFT JOIN perfis_acesso pa ON u.perfil_id = pa.id
     WHERE u.id = $1
        OR (
          u.tipo <> 'admin'
          AND u.congregacoes_acesso IS NOT NULL
          ${escopo ? 'AND u.congregacoes_acesso <@ $2::int[]' : ''}
        )
     ORDER BY u.nome`,
    escopo ? [user.id, escopo] : [user.id],
  )
  return Response.json(result.rows)
}, { permissionStrict: 'usuarios_gerenciar' })

export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json()
  const { nome, email, senha } = body
  if (!nome || !email || !senha) throw new ApiError(400, 'Nome, email e senha são obrigatórios')
  if (typeof senha !== 'string' || senha.length < 6) {
    throw new ApiError(400, 'A senha deve ter pelo menos 6 caracteres')
  }

  const deveTrocarSenha = body.deve_trocar_senha !== false // default: TRUE

  let tipo: 'admin' | 'usuario'
  let congAcesso: number[] | null
  let deptAcesso: number[] | null
  const perfilId: number | null = body.perfil_id || null

  if (user.tipo === 'admin') {
    tipo = body.tipo === 'admin' ? 'admin' : 'usuario'
    congAcesso = Array.isArray(body.congregacoes_acesso) && body.congregacoes_acesso.length > 0
      ? body.congregacoes_acesso : null
    deptAcesso = Array.isArray(body.departamentos_acesso) && body.departamentos_acesso.length > 0
      ? body.departamentos_acesso : null
  } else {
    // Gestor de congregação: nunca cria admin; escopo limitado ao dele.
    tipo = 'usuario'
    const s = sanitizarAcessoDeGestor(user, body)
    congAcesso = s.congregacoes_acesso
    deptAcesso = null
    if (s.departamentos_acesso_bruto.length > 0) {
      const permitidos = await departamentosPermitidos(user, s.departamentos_acesso_bruto, pool)
      deptAcesso = permitidos.length > 0 ? permitidos : null
    }
    if (escopoCongregacoes(user) && (!congAcesso || congAcesso.length === 0)) {
      throw new ApiError(400, 'Selecione ao menos uma congregação para o usuário.')
    }
  }

  // Perfil precisa ser global ou de uma congregação a que o gestor e o novo
  // usuário têm acesso.
  await assertPerfilAtribuivel(user, perfilId, congAcesso, pool)

  const senhaCriptografada = await bcrypt.hash(senha, 10)
  const result = await pool.query(
    `INSERT INTO usuarios (nome, email, senha, tipo, perfil_id, departamentos_acesso, congregacoes_acesso, deve_trocar_senha)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [nome, email, senhaCriptografada, tipo, perfilId, deptAcesso, congAcesso, deveTrocarSenha],
  )
  return Response.json({ id: result.rows[0].id, message: 'Usuário criado com sucesso' })
}, { permissionStrict: 'usuarios_gerenciar' })
