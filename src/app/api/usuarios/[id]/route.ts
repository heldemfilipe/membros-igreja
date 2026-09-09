import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { withAuthParams, ApiError } from '@/lib/api'
import { notFound } from '@/lib/auth'
import {
  escopoCongregacoes,
  departamentosPermitidos,
  sanitizarAcessoDeGestor,
  assertUsuarioAlvoNoEscopo,
} from '@/lib/scope'

async function carregarAlvo(id: string) {
  const r = await pool.query(
    'SELECT id, tipo, perfil_id, congregacoes_acesso, departamentos_acesso FROM usuarios WHERE id = $1',
    [id],
  )
  return r.rows[0] as
    | { id: number; tipo: string; perfil_id: number | null; congregacoes_acesso: number[] | null; departamentos_acesso: number[] | null }
    | undefined
}

export const PUT = withAuthParams<{ id: string }>(async (req, user, { params }) => {
  const { id } = params
  const alvo = await carregarAlvo(id)
  if (!alvo) return notFound('Usuário não encontrado')

  // Gestor (não-admin): só mexe em usuários da própria congregação, nunca em admins.
  assertUsuarioAlvoNoEscopo(user, alvo)

  const body = await req.json()
  const { nome, email, senha, ativo } = body

  let tipo: string
  let perfilId: number | null
  let congAcesso: number[] | null
  let deptAcesso: number[] | null

  if (user.tipo === 'admin') {
    tipo = body.tipo
    perfilId = body.perfil_id || null
    congAcesso = Array.isArray(body.congregacoes_acesso) && body.congregacoes_acesso.length > 0
      ? body.congregacoes_acesso : null
    deptAcesso = Array.isArray(body.departamentos_acesso) && body.departamentos_acesso.length > 0
      ? body.departamentos_acesso : null
  } else if (alvo.id === user.id) {
    // Gestor editando a própria conta por aqui: não altera o próprio nível de
    // acesso (tipo/perfil/escopo). Para nome e senha existe a tela "Minha Conta".
    tipo = alvo.tipo
    perfilId = alvo.perfil_id
    congAcesso = alvo.congregacoes_acesso
    deptAcesso = alvo.departamentos_acesso
  } else {
    // Gestor não pode promover a admin nem alterar o tipo do alvo.
    tipo = alvo.tipo === 'admin' ? 'admin' : 'usuario'
    perfilId = body.perfil_id || null
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

  const deveTrocarSenha: boolean | undefined =
    typeof body.deve_trocar_senha === 'boolean' ? body.deve_trocar_senha : undefined

  if (senha && (typeof senha !== 'string' || senha.length < 6)) {
    throw new ApiError(400, 'A senha deve ter pelo menos 6 caracteres')
  }

  const sets = [
    'nome=$1', 'email=$2', 'tipo=$3', 'ativo=$4',
    'perfil_id=$5', 'departamentos_acesso=$6', 'congregacoes_acesso=$7',
  ]
  const values: (string | boolean | number | null | number[])[] = [
    nome, email, tipo, ativo, perfilId, deptAcesso, congAcesso,
  ]

  if (senha) {
    values.push(await bcrypt.hash(senha, 10))
    sets.push(`senha=$${values.length}`)
    // Ao definir uma senha nova manualmente, exige a troca no próximo acesso
    // (a menos que o admin desmarque explicitamente).
    values.push(deveTrocarSenha ?? true)
    sets.push(`deve_trocar_senha=$${values.length}`)
  } else if (deveTrocarSenha !== undefined) {
    values.push(deveTrocarSenha)
    sets.push(`deve_trocar_senha=$${values.length}`)
  }

  values.push(id)
  await pool.query(`UPDATE usuarios SET ${sets.join(', ')} WHERE id=$${values.length}`, values)

  return Response.json({ message: 'Usuário atualizado com sucesso' })
}, { permissionStrict: 'usuarios_gerenciar' })

export const DELETE = withAuthParams<{ id: string }>(async (_req, user, { params }) => {
  const { id } = params
  if (parseInt(id) === user.id) {
    throw new ApiError(400, 'Não é possível deletar seu próprio usuário')
  }
  const alvo = await carregarAlvo(id)
  if (!alvo) return notFound('Usuário não encontrado')
  assertUsuarioAlvoNoEscopo(user, alvo)

  await pool.query('DELETE FROM usuarios WHERE id = $1', [id])
  return Response.json({ message: 'Usuário deletado com sucesso' })
}, { permissionStrict: 'usuarios_gerenciar' })
