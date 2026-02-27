import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized, forbidden } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  // Restrição por departamentos
  const deptoAcesso = user.departamentos_acesso && user.departamentos_acesso.length > 0
    ? user.departamentos_acesso : null

  try {
    const deptParams: (number[])[] = []
    let deptWhere = ''
    if (deptoAcesso) {
      deptWhere = ` WHERE d.id = ANY($1::int[])`
      deptParams.push(deptoAcesso)
    }

    const result = await pool.query(
      `SELECT d.*, (SELECT COUNT(*) FROM membro_departamentos md WHERE md.departamento_id = d.id) as total_membros
       FROM departamentos d${deptWhere} ORDER BY d.nome`,
      deptParams
    )
    return Response.json(result.rows)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()
  if (user.tipo !== 'admin') return forbidden()

  const { nome, descricao } = await req.json()

  if (!nome) {
    return Response.json({ error: 'Nome é obrigatório' }, { status: 400 })
  }

  try {
    const result = await pool.query(
      'INSERT INTO departamentos (nome, descricao) VALUES ($1, $2) RETURNING id',
      [nome, descricao || null]
    )
    return Response.json({ id: result.rows[0].id, message: 'Departamento criado com sucesso' })
  } catch (error: unknown) {
    if ((error as { code?: string }).code === '23505') {
      return Response.json({ error: 'Departamento já existe' }, { status: 400 })
    }
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
