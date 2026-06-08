import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuthParams, parseBody } from '@/lib/api'
import { notFound } from '@/lib/auth'
import { toNull } from '@/lib/utils'
import { inferirRelacoesFamiliares } from '@/lib/familyInference'
import { membroAcessivel } from '@/lib/access'
import { membroSchema, buildUpdateMembro } from '@/lib/membros-schema'

function parentescoReverso(parentesco: string, sexoDoMembro: string | null): string {
  switch (parentesco) {
    case 'Cônjuge':  return 'Cônjuge'
    case 'Filho(a)': return sexoDoMembro === 'Masculino' ? 'Pai' : sexoDoMembro === 'Feminino' ? 'Mãe' : 'Outro'
    case 'Pai':      return 'Filho(a)'
    case 'Mãe':      return 'Filho(a)'
    case 'Irmão(ã)': return 'Irmão(ã)'
    case 'Avô/Avó':  return 'Neto(a)'
    case 'Neto(a)':  return 'Avô/Avó'
    default:         return 'Outro'
  }
}

export const GET = withAuthParams<{ id: string }>(async (req, user, { params }) => {
  const { id } = params
  // Escopo de acesso: usuário restrito não lê membro fora da sua congregação/dept.
  if (!(await membroAcessivel(user, id, pool))) return notFound('Membro não encontrado')

  const [membroResult, historicosResult, familiaresResult, deptResult] = await Promise.all([
    pool.query('SELECT * FROM membros WHERE id = $1', [id]),
    pool.query('SELECT * FROM historicos WHERE membro_id = $1 ORDER BY data', [id]),
    pool.query(
      `SELECT f.id, f.membro_id, f.parentesco, f.nome, f.observacoes, f.membro_vinculado_id,
              COALESCE(f.data_nascimento, m.data_nascimento) AS data_nascimento
       FROM familiares f
       LEFT JOIN membros m ON m.id = f.membro_vinculado_id
       WHERE f.membro_id = $1`,
      [id],
    ),
    pool.query(
      `SELECT md.departamento_id as id, d.nome, md.cargo_departamento
       FROM membro_departamentos md
       INNER JOIN departamentos d ON md.departamento_id = d.id
       WHERE md.membro_id = $1`,
      [id],
    ),
  ])

  if (membroResult.rows.length === 0) return notFound('Membro não encontrado')

  return Response.json({
    ...membroResult.rows[0],
    historicos: historicosResult.rows,
    familiares: familiaresResult.rows,
    departamentos: deptResult.rows,
  })
})

export const PUT = withAuthParams<{ id: string }>(async (req, user, { params }) => {
  const { id } = params
  if (!(await membroAcessivel(user, id, pool))) return notFound('Membro não encontrado')

  const body = await parseBody(req, membroSchema)
  const { sexo, nome, data_nascimento, historicos = [], familiares = [], departamentos = [] } = body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const update = buildUpdateMembro(body, id)
    await client.query(update.text, update.values)

    await client.query('DELETE FROM historicos WHERE membro_id = $1', [id])

    // Remove apenas os vínculos reversos que ESPELHAM os vínculos antigos deste
    // membro (membros que ele referenciava). Não toca em relações que outros
    // membros criaram apontando para este — evita perda de dados de terceiros.
    await client.query(
      `DELETE FROM familiares
       WHERE membro_vinculado_id = $1
         AND membro_id IN (
           SELECT membro_vinculado_id FROM familiares
           WHERE membro_id = $1 AND membro_vinculado_id IS NOT NULL
         )`,
      [id],
    )
    await client.query('DELETE FROM familiares WHERE membro_id = $1', [id])

    for (const h of historicos) {
      if (!h.tipo) continue
      await client.query(
        'INSERT INTO historicos (membro_id, tipo, data, localidade, observacoes) VALUES ($1,$2,$3,$4,$5)',
        [id, h.tipo, toNull(h.data), toNull(h.localidade), toNull(h.observacoes)],
      )
    }

    for (const f of familiares) {
      await client.query(
        'INSERT INTO familiares (membro_id, parentesco, nome, data_nascimento, observacoes, membro_vinculado_id) VALUES ($1,$2,$3,$4,$5,$6)',
        [id, f.parentesco, f.nome, toNull(f.data_nascimento), toNull(f.observacoes), f.membro_vinculado_id || null],
      )
      if (f.membro_vinculado_id) {
        const reverso = parentescoReverso(f.parentesco, toNull(sexo))
        await client.query(
          'INSERT INTO familiares (membro_id, parentesco, nome, data_nascimento, membro_vinculado_id) VALUES ($1,$2,$3,$4,$5)',
          [f.membro_vinculado_id, reverso, nome, toNull(data_nascimento), id],
        )
      }
    }

    await inferirRelacoesFamiliares(Number(id), toNull(sexo), client)

    const dataCasamentoFinal = toNull(body.data_casamento)
    if (dataCasamentoFinal) {
      await client.query(
        `UPDATE membros SET data_casamento = $1
         WHERE id IN (
           SELECT membro_vinculado_id FROM familiares
           WHERE membro_id = $2 AND parentesco = 'Cônjuge' AND membro_vinculado_id IS NOT NULL
         ) AND data_casamento IS NULL`,
        [dataCasamentoFinal, id],
      )
    }

    await client.query('DELETE FROM membro_departamentos WHERE membro_id = $1', [id])
    for (const d of departamentos) {
      if (d.id) {
        await client.query(
          'INSERT INTO membro_departamentos (membro_id, departamento_id, cargo_departamento) VALUES ($1,$2,$3)',
          [id, d.id, toNull(d.cargo_departamento)],
        )
      }
    }

    await client.query('COMMIT')
    return Response.json({ message: 'Membro atualizado com sucesso!' })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}, { permission: 'membros_editar' })

export const PATCH = withAuthParams<{ id: string }>(async (req, user, { params }) => {
  const { id } = params
  if (!(await membroAcessivel(user, id, pool))) return notFound('Membro não encontrado')

  const body = await req.json()
  if (typeof body.ativo !== 'boolean') {
    return Response.json({ error: 'Campo "ativo" (boolean) é obrigatório.' }, { status: 400 })
  }

  await pool.query('UPDATE membros SET ativo = $1 WHERE id = $2', [body.ativo, id])
  const msg = body.ativo ? 'Membro reativado com sucesso!' : 'Membro desativado com sucesso!'
  return Response.json({ message: msg })
}, { permission: 'membros_editar' })

export const DELETE = withAuthParams<{ id: string }>(async (req, user, { params }) => {
  const { id } = params
  if (!(await membroAcessivel(user, id, pool))) return notFound('Membro não encontrado')

  await pool.query('DELETE FROM membros WHERE id = $1', [id])
  return Response.json({ message: 'Membro deletado com sucesso!' })
}, { permission: 'membros_excluir' })
