import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuthParams, ApiError } from '@/lib/api'
import { notFound } from '@/lib/auth'
import { assertCongregacaoNoEscopoDb } from '@/lib/scope'

export const PUT = withAuthParams<{ id: string }>(async (req, _user, { params }) => {
  const { id } = params
  const {
    nome, cidade, estado, observacoes, nome_oficial,
    dirigente_membro_id, dirigente_telefone, notificar_whatsapp, mensagem_boas_vindas,
    cultos,
  } = await req.json()

  if (!nome?.trim()) throw new ApiError(400, 'Nome é obrigatório.')

  // Tudo na MESMA conexão (pool max:1 — ver nota em recepcao/visitante).
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Atualiza o nome nos membros vinculados se o nome mudar
    const old = await client.query('SELECT nome FROM congregacoes WHERE id = $1', [id])
    if (old.rows.length > 0 && old.rows[0].nome !== nome.trim()) {
      await client.query('UPDATE membros SET igreja = $1 WHERE igreja = $2', [nome.trim(), old.rows[0].nome])
    }

    const result = await client.query(
      `UPDATE congregacoes
       SET nome=$1, cidade=$2, estado=$3, observacoes=$4,
           dirigente_membro_id=$5, dirigente_telefone=$6, notificar_whatsapp=$7, mensagem_boas_vindas=$8,
           nome_oficial=$9
       WHERE id=$10 RETURNING *`,
      [
        nome.trim(), cidade || null, estado || null, observacoes || null,
        dirigente_membro_id || null,
        (dirigente_telefone || '').trim() || null,
        notificar_whatsapp !== false,
        (mensagem_boas_vindas || '').trim() || null,
        (nome_oficial || '').trim() || null,
        id,
      ],
    )
    if (result.rows.length === 0) {
      await client.query('ROLLBACK')
      return notFound('Congregação não encontrada.')
    }

    // Cultos vêm como lista completa do form — substitui tudo (igual formações do membro).
    if (Array.isArray(cultos)) {
      await client.query('DELETE FROM cultos WHERE congregacao_id = $1', [id])
      for (const cu of cultos) {
        if (!cu?.nome?.trim() || cu.dia_semana == null || !cu?.horario) continue
        await client.query(
          'INSERT INTO cultos (congregacao_id, nome, dia_semana, horario) VALUES ($1,$2,$3,$4)',
          [id, cu.nome.trim(), Number(cu.dia_semana), cu.horario],
        )
      }
    }

    await client.query('COMMIT')
    return Response.json(result.rows[0])
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}, { adminOnly: true })

export const DELETE = withAuthParams<{ id: string }>(async (_req, _user, { params }) => {
  await pool.query('DELETE FROM congregacoes WHERE id = $1', [params.id])
  return Response.json({ message: 'Congregação excluída.' })
}, { adminOnly: true })

// GET /api/congregacoes/[id] — membros dessa congregação
export const GET = withAuthParams<{ id: string }>(async (_req: NextRequest, user, { params }) => {
  await assertCongregacaoNoEscopoDb(user, Number(params.id), pool)
  const congResult = await pool.query('SELECT nome FROM congregacoes WHERE id = $1', [params.id])
  if (congResult.rows.length === 0) return notFound('Congregação não encontrada.')
  const nome = congResult.rows[0].nome
  const membros = await pool.query(
    `SELECT id, nome, cargo, sexo, tipo_participante, telefone_principal, data_nascimento
     FROM membros WHERE igreja = $1 ORDER BY nome`,
    [nome],
  )
  return Response.json(membros.rows)
})
