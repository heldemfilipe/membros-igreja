import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { withAuthParams, ApiError } from '@/lib/api'

export const PUT = withAuthParams<{ id: string }>(async (req, _user, { params }) => {
  const { id } = params
  const { nome, email, senha, tipo, ativo, perfil_id, departamentos_acesso, congregacoes_acesso } = await req.json()

  const deptAcesso = Array.isArray(departamentos_acesso) && departamentos_acesso.length > 0 ? departamentos_acesso : null
  const congAcesso = Array.isArray(congregacoes_acesso) && congregacoes_acesso.length > 0 ? congregacoes_acesso : null

  let query: string
  let queryParams: (string | boolean | number | null | number[])[]
  if (senha) {
    const senhaCriptografada = await bcrypt.hash(senha, 10)
    query = 'UPDATE usuarios SET nome=$1, email=$2, senha=$3, tipo=$4, ativo=$5, perfil_id=$6, departamentos_acesso=$7, congregacoes_acesso=$8 WHERE id=$9'
    queryParams = [nome, email, senhaCriptografada, tipo, ativo, perfil_id || null, deptAcesso, congAcesso, id]
  } else {
    query = 'UPDATE usuarios SET nome=$1, email=$2, tipo=$3, ativo=$4, perfil_id=$5, departamentos_acesso=$6, congregacoes_acesso=$7 WHERE id=$8'
    queryParams = [nome, email, tipo, ativo, perfil_id || null, deptAcesso, congAcesso, id]
  }
  await pool.query(query, queryParams)

  return Response.json({ message: 'Usuário atualizado com sucesso' })
}, { adminOnly: true })

export const DELETE = withAuthParams<{ id: string }>(async (_req, user, { params }) => {
  const { id } = params
  if (parseInt(id) === user.id) {
    throw new ApiError(400, 'Não é possível deletar seu próprio usuário')
  }
  await pool.query('DELETE FROM usuarios WHERE id = $1', [id])
  return Response.json({ message: 'Usuário deletado com sucesso' })
}, { adminOnly: true })
