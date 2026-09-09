import pool from '@/lib/db'
import { withAuthParams, ApiError } from '@/lib/api'
import { notFound } from '@/lib/auth'
import {
  perfilVisivel,
  assertPerfilGerenciavel,
  limitarPermissoesAoQueUsuarioTem,
} from '@/lib/scope'

async function congDoPerfil(id: string): Promise<number | null | undefined> {
  const r = await pool.query('SELECT congregacao_id FROM perfis_acesso WHERE id = $1', [id])
  return r.rows.length ? (r.rows[0].congregacao_id as number | null) : undefined
}

export const GET = withAuthParams<{ id: string }>(async (_req, user, { params }) => {
  const cong = await congDoPerfil(params.id)
  if (cong === undefined) return notFound('Perfil não encontrado')
  if (!perfilVisivel(user, cong)) return notFound('Perfil não encontrado')

  const result = await pool.query(
    `SELECT p.id, p.nome, p.descricao, p.permissoes, p.congregacao_id,
            c.nome AS congregacao_nome, p.created_at
     FROM perfis_acesso p
     LEFT JOIN congregacoes c ON p.congregacao_id = c.id
     WHERE p.id = $1`,
    [params.id],
  )
  return Response.json(result.rows[0])
}, { permissionStrict: 'usuarios_gerenciar' })

export const PUT = withAuthParams<{ id: string }>(async (req, user, { params }) => {
  const cong = await congDoPerfil(params.id)
  if (cong === undefined) return notFound('Perfil não encontrado')
  assertPerfilGerenciavel(user, cong) // gestor: só perfis da própria congregação

  const { nome, descricao, permissoes, congregacao_id } = await req.json()
  if (!nome?.trim()) throw new ApiError(400, 'Nome é obrigatório')

  const permissoesFinais = limitarPermissoesAoQueUsuarioTem(user, permissoes)

  if (user.tipo === 'admin') {
    // Só o admin geral pode mover um perfil entre Global e uma congregação.
    const novaCong = congregacao_id != null && congregacao_id !== '' ? Number(congregacao_id) : null
    await pool.query(
      'UPDATE perfis_acesso SET nome=$1, descricao=$2, permissoes=$3, congregacao_id=$4 WHERE id=$5',
      [nome.trim(), descricao || null, JSON.stringify(permissoesFinais), novaCong, params.id],
    )
  } else {
    // Gestor: congregação do perfil é imutável.
    await pool.query(
      'UPDATE perfis_acesso SET nome=$1, descricao=$2, permissoes=$3 WHERE id=$4',
      [nome.trim(), descricao || null, JSON.stringify(permissoesFinais), params.id],
    )
  }
  return Response.json({ message: 'Perfil atualizado com sucesso' })
}, { permissionStrict: 'usuarios_gerenciar' })

export const DELETE = withAuthParams<{ id: string }>(async (_req, user, { params }) => {
  const cong = await congDoPerfil(params.id)
  if (cong === undefined) return notFound('Perfil não encontrado')
  assertPerfilGerenciavel(user, cong)

  await pool.query('UPDATE usuarios SET perfil_id = NULL WHERE perfil_id = $1', [params.id])
  await pool.query('DELETE FROM perfis_acesso WHERE id = $1', [params.id])
  return Response.json({ message: 'Perfil excluído com sucesso' })
}, { permissionStrict: 'usuarios_gerenciar' })
