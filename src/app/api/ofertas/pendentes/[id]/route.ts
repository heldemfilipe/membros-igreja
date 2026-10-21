import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuthParams, ApiError, temPermissao } from '@/lib/api'
import { assertCongregacaoNoEscopoDb } from '@/lib/scope'
import { podeLancar, podeEditarQualquer } from '@/lib/ofertas'

/**
 * Resolve uma pessoa pendente:
 *  - { acao: 'cadastrar', tipo_participante? }  cria o cadastro (nome, telefone,
 *    congregação) — exige `membros_editar`; o resto da ficha se completa depois
 *  - { acao: 'vincular', membro_id }             liga a um cadastro que já existe
 *  - { acao: 'descartar' }                       tira da lista (sem cadastro)
 *  - { acao: 'reabrir' }                         volta para a lista
 * Em 'cadastrar'/'vincular', os lançamentos antigos passam a apontar para o membro.
 */
export const PATCH = withAuthParams<{ id: string }>(async (req: NextRequest, user, { params }) => {
  const id = Number(params.id)
  if (!Number.isInteger(id)) throw new ApiError(404, 'Pessoa não encontrada.')

  let body: { acao?: string; tipo_participante?: string; membro_id?: number }
  try { body = await req.json() } catch { throw new ApiError(400, 'Corpo da requisição inválido (JSON esperado).') }

  const { rows } = await pool.query(
    `SELECT p.*, c.nome AS congregacao_nome FROM pessoas_pendentes p
     JOIN congregacoes c ON c.id = p.congregacao_id WHERE p.id = $1`,
    [id],
  )
  if (rows.length === 0) throw new ApiError(404, 'Pessoa não encontrada.')
  const p = rows[0]
  await assertCongregacaoNoEscopoDb(user, p.congregacao_id, pool)

  const podeCadastrar = temPermissao(user, 'membros_editar')
  const podeResolver = podeCadastrar || podeLancar(user) || podeEditarQualquer(user)

  if (body.acao === 'cadastrar' || body.acao === 'vincular') {
    if (p.status !== 'pendente') throw new ApiError(409, 'Esta pessoa já foi resolvida.')

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      let membroId: number
      if (body.acao === 'cadastrar') {
        if (!podeCadastrar) throw new ApiError(403, 'Você não tem permissão para cadastrar membros.')
        const tipo = ['Membro', 'Congregado', 'Visitante'].includes(body.tipo_participante ?? '')
          ? body.tipo_participante
          : 'Visitante'
        const ins = await client.query(
          `INSERT INTO membros (nome, telefone_principal, igreja, tipo_participante)
           VALUES ($1,$2,$3,$4) RETURNING id`,
          [p.nome, p.telefone, p.congregacao_nome, tipo],
        )
        membroId = ins.rows[0].id
      } else {
        if (!podeResolver) throw new ApiError(403, 'Você não tem permissão para esta ação.')
        membroId = Number(body.membro_id)
        const m = await client.query('SELECT 1 FROM membros WHERE id = $1 AND igreja = $2', [membroId, p.congregacao_nome])
        if (m.rows.length === 0) throw new ApiError(400, 'Escolha um cadastro desta congregação.')
      }
      await client.query(
        `UPDATE pessoas_pendentes SET status = 'cadastrado', membro_id = $2, resolvido_em = NOW() WHERE id = $1`,
        [id, membroId],
      )
      await client.query('UPDATE oferta_itens SET membro_id = $2 WHERE pessoa_pendente_id = $1', [id, membroId])
      await client.query('COMMIT')
      return Response.json({
        message: body.acao === 'cadastrar' ? 'Cadastro criado! Complete a ficha em Membros.' : 'Vinculado ao cadastro.',
        membro_id: membroId,
      })
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  }

  if (body.acao === 'descartar' || body.acao === 'reabrir') {
    if (!podeResolver) throw new ApiError(403, 'Você não tem permissão para esta ação.')
    if (body.acao === 'descartar' && p.status !== 'pendente') throw new ApiError(409, 'Esta pessoa já foi resolvida.')
    if (body.acao === 'reabrir' && p.status !== 'descartado') throw new ApiError(409, 'Só é possível reabrir quem foi descartado.')
    await pool.query(
      `UPDATE pessoas_pendentes SET status = $2, resolvido_em = $3 WHERE id = $1`,
      [id, body.acao === 'descartar' ? 'descartado' : 'pendente', body.acao === 'descartar' ? new Date() : null],
    )
    return Response.json({ message: body.acao === 'descartar' ? 'Removido da lista.' : 'Voltou para a lista.' })
  }

  throw new ApiError(400, 'Ação inválida.')
})
