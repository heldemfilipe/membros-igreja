import pool from '@/lib/db'
import { withAuthParams, ApiError } from '@/lib/api'
import { notFound } from '@/lib/auth'
import { assertDepartamentoNoEscopo } from '@/lib/scope'

export const GET = withAuthParams<{ id: string }>(async (_req, user, { params }) => {
  const { id } = params

  // Restrição de departamento E de congregação (impede ler membros de um
  // departamento de outra congregação apenas pelo ID).
  await assertDepartamentoNoEscopo(user, id, pool)

  const result = await pool.query(
    `SELECT m.id, m.nome, m.conhecido_como, m.cargo, m.tipo_participante, m.telefone_principal, m.sexo, m.data_nascimento, md.cargo_departamento
     FROM membros m
     INNER JOIN membro_departamentos md ON m.id = md.membro_id
     WHERE md.departamento_id = $1
     ORDER BY md.cargo_departamento IS NULL, md.cargo_departamento, m.nome`,
    [id],
  )
  return Response.json(result.rows)
})

export const POST = withAuthParams<{ id: string }>(async (req, _user, { params }) => {
  const { membro_id, cargo_departamento } = await req.json()
  await pool.query(
    'INSERT INTO membro_departamentos (membro_id, departamento_id, cargo_departamento) VALUES ($1, $2, $3)',
    [membro_id, params.id, cargo_departamento || null],
  )
  return Response.json({ message: 'Membro adicionado ao departamento' })
}, { adminOnly: true })

export const PUT = withAuthParams<{ id: string }>(async (req, _user, { params }) => {
  const { membro_id, cargo_departamento } = await req.json()
  if (!membro_id) throw new ApiError(400, 'membro_id é obrigatório')

  const result = await pool.query(
    'UPDATE membro_departamentos SET cargo_departamento = $1 WHERE membro_id = $2 AND departamento_id = $3',
    [cargo_departamento || null, membro_id, params.id],
  )
  if (result.rowCount === 0) return notFound('Membro não encontrado neste departamento')
  return Response.json({ message: 'Cargo atualizado com sucesso' })
}, { adminOnly: true })
