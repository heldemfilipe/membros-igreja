import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized, forbidden } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  const { id } = params

  // Verificar se o usuário tem acesso a este departamento
  const deptoAcesso = user.departamentos_acesso && user.departamentos_acesso.length > 0
    ? user.departamentos_acesso : null
  if (deptoAcesso && !deptoAcesso.includes(parseInt(id))) {
    return forbidden()
  }

  try {
    const result = await pool.query(
      `SELECT m.id, m.nome, m.conhecido_como, m.cargo, m.tipo_participante, m.telefone_principal, m.sexo, m.data_nascimento, md.cargo_departamento
       FROM membros m
       INNER JOIN membro_departamentos md ON m.id = md.membro_id
       WHERE md.departamento_id = $1
       ORDER BY md.cargo_departamento IS NULL, md.cargo_departamento, m.nome`,
      [id]
    )
    return Response.json(result.rows)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()
  if (user.tipo !== 'admin') return forbidden()

  const { id } = params
  const { membro_id, cargo_departamento } = await req.json()

  try {
    await pool.query(
      'INSERT INTO membro_departamentos (membro_id, departamento_id, cargo_departamento) VALUES ($1, $2, $3)',
      [membro_id, id, cargo_departamento || null]
    )
    return Response.json({ message: 'Membro adicionado ao departamento' })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === '23505') {
      return Response.json({ error: 'Membro já está neste departamento' }, { status: 400 })
    }
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()
  if (user.tipo !== 'admin') return forbidden()

  const { id } = params
  const { membro_id, cargo_departamento } = await req.json()

  if (!membro_id) {
    return Response.json({ error: 'membro_id é obrigatório' }, { status: 400 })
  }

  try {
    const result = await pool.query(
      'UPDATE membro_departamentos SET cargo_departamento = $1 WHERE membro_id = $2 AND departamento_id = $3',
      [cargo_departamento || null, membro_id, id]
    )
    if (result.rowCount === 0) {
      return Response.json({ error: 'Membro não encontrado neste departamento' }, { status: 404 })
    }
    return Response.json({ message: 'Cargo atualizado com sucesso' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
