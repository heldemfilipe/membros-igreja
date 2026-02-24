import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { verificarToken, unauthorized, forbidden } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()
  if (user.tipo !== 'admin') return forbidden()

  const { id } = params
  const { nome, email, senha, tipo, ativo, perfil_id, departamentos_acesso } = await req.json()

  try {
    let query: string
    let queryParams: (string | boolean | number | null | number[])[]

    const deptAcesso = Array.isArray(departamentos_acesso) && departamentos_acesso.length > 0
      ? departamentos_acesso
      : null

    try {
      // Tenta atualizar com perfil e departamentos
      if (senha) {
        const senhaCriptografada = await bcrypt.hash(senha, 10)
        query = 'UPDATE usuarios SET nome=$1, email=$2, senha=$3, tipo=$4, ativo=$5, perfil_id=$6, departamentos_acesso=$7 WHERE id=$8'
        queryParams = [nome, email, senhaCriptografada, tipo, ativo, perfil_id || null, deptAcesso, id]
      } else {
        query = 'UPDATE usuarios SET nome=$1, email=$2, tipo=$3, ativo=$4, perfil_id=$5, departamentos_acesso=$6 WHERE id=$7'
        queryParams = [nome, email, tipo, ativo, perfil_id || null, deptAcesso, id]
      }
      await pool.query(query, queryParams)
    } catch {
      // Fallback sem colunas de perfil
      if (senha) {
        const senhaCriptografada = await bcrypt.hash(senha, 10)
        query = 'UPDATE usuarios SET nome=$1, email=$2, senha=$3, tipo=$4, ativo=$5 WHERE id=$6'
        queryParams = [nome, email, senhaCriptografada, tipo, ativo, id]
      } else {
        query = 'UPDATE usuarios SET nome=$1, email=$2, tipo=$3, ativo=$4 WHERE id=$5'
        queryParams = [nome, email, tipo, ativo, id]
      }
      await pool.query(query, queryParams)
    }

    return Response.json({ message: 'Usuário atualizado com sucesso' })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === '23505') {
      return Response.json({ error: 'Email já cadastrado' }, { status: 400 })
    }
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()
  if (user.tipo !== 'admin') return forbidden()

  const { id } = params

  if (parseInt(id) === user.id) {
    return Response.json({ error: 'Não é possível deletar seu próprio usuário' }, { status: 400 })
  }

  try {
    await pool.query('DELETE FROM usuarios WHERE id = $1', [id])
    return Response.json({ message: 'Usuário deletado com sucesso' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
