import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized } from '@/lib/auth'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  const { id } = params
  const { nome, cidade, estado, observacoes } = await req.json()

  if (!nome?.trim()) {
    return Response.json({ error: 'Nome é obrigatório.' }, { status: 400 })
  }

  try {
    // Atualiza o nome nos membros vinculados se o nome mudar
    const old = await pool.query('SELECT nome FROM congregacoes WHERE id = $1', [id])
    if (old.rows.length > 0 && old.rows[0].nome !== nome.trim()) {
      await pool.query('UPDATE membros SET igreja = $1 WHERE igreja = $2', [nome.trim(), old.rows[0].nome])
    }

    const result = await pool.query(
      'UPDATE congregacoes SET nome=$1, cidade=$2, estado=$3, observacoes=$4 WHERE id=$5 RETURNING *',
      [nome.trim(), cidade || null, estado || null, observacoes || null, id]
    )
    if (result.rows.length === 0) {
      return Response.json({ error: 'Congregação não encontrada.' }, { status: 404 })
    }
    return Response.json(result.rows[0])
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  const { id } = params

  try {
    await pool.query('DELETE FROM congregacoes WHERE id = $1', [id])
    return Response.json({ message: 'Congregação excluída.' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}

// GET /api/congregacoes/[id]/membros — membros dessa congregação
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  const { id } = params

  try {
    const congResult = await pool.query('SELECT nome FROM congregacoes WHERE id = $1', [id])
    if (congResult.rows.length === 0) {
      return Response.json({ error: 'Congregação não encontrada.' }, { status: 404 })
    }
    const nome = congResult.rows[0].nome
    const membros = await pool.query(
      `SELECT id, nome, cargo, sexo, tipo_participante, telefone_principal, data_nascimento
       FROM membros WHERE igreja = $1 ORDER BY nome`,
      [nome]
    )
    return Response.json(membros.rows)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
