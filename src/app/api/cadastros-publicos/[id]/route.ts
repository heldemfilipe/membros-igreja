import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuthParams, ApiError } from '@/lib/api'
import { notFound } from '@/lib/auth'
import { assertCongregacaoNoEscopoDb } from '@/lib/scope'

/**
 * PATCH /api/cadastros-publicos/[id] — { acao: 'aprovar' | 'rejeitar' }
 * Aprovar cria o membro (tipo Visitante) e uma visita, igual ao cadastro
 * rápido da recepção — assim o aprovado já cai na lista normal de
 * acompanhamento. Rejeitar só marca o status, sem criar nada.
 */
export const PATCH = withAuthParams<{ id: string }>(async (req: NextRequest, user, { params }) => {
  const { acao } = await req.json()
  if (acao !== 'aprovar' && acao !== 'rejeitar') throw new ApiError(400, 'Ação inválida.')

  // Tudo na MESMA conexão (pool max:1 — ver nota em recepcao/visitante).
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const cad = await client.query('SELECT * FROM cadastros_publicos WHERE id = $1 FOR UPDATE', [params.id])
    if (cad.rows.length === 0) {
      await client.query('ROLLBACK')
      return notFound('Cadastro não encontrado.')
    }
    const c = cad.rows[0]
    if (c.status !== 'pendente') {
      await client.query('ROLLBACK')
      throw new ApiError(409, 'Este cadastro já foi revisado.')
    }

    await assertCongregacaoNoEscopoDb(user, c.congregacao_id, client)

    let membroId: number | null = null
    if (acao === 'aprovar') {
      const d = c.dados || {}
      let igreja: string | null = null
      if (c.congregacao_id) {
        const congR = await client.query('SELECT nome FROM congregacoes WHERE id = $1', [c.congregacao_id])
        igreja = congR.rows[0]?.nome || null
      }

      const m = await client.query(
        `INSERT INTO membros (
           nome, telefone_principal, email, data_nascimento, igreja, tipo_participante,
           cep, logradouro, numero, complemento, bairro, cidade, estado,
           data_casamento, estado_civil, grau_instrucao, profissao,
           dons_talentos, dons_desejados, batizado_espirito_santo, batizado_aguas,
           vida_ministerial, origem_religiosa, origem_religiosa_detalhe,
           cpf, identidade, tipo_sanguineo, naturalidade, uf_naturalidade,
           desafios_pessoais, convidado_por, informacoes_complementares
         ) VALUES (
           $1,$2,$3,$4,$5,'Visitante',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
           $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31
         ) RETURNING id`,
        [
          c.nome, c.telefone || null, d.email || null, d.data_nascimento || null, igreja,
          d.cep || null, d.logradouro || null, d.numero || null, d.complemento || null,
          d.bairro || null, d.cidade || null, d.estado || null,
          d.data_casamento || null, d.estado_civil || null,
          d.grau_instrucao || null, d.profissao || null,
          d.dons_talentos || null, d.dons_desejados || null,
          d.batizado_espirito_santo ?? null, d.batizado_aguas ?? null,
          d.vida_ministerial || null, d.origem_religiosa || null, d.origem_religiosa_detalhe || null,
          d.cpf || null, d.identidade || null, d.tipo_sanguineo || null,
          d.naturalidade || null, d.uf_naturalidade || null,
          d.desafios_pessoais || null, d.convidado_por || null, d.informacoes_complementares || null,
        ],
      )
      membroId = m.rows[0].id
      await client.query('INSERT INTO visitas (membro_id, data_visita) VALUES ($1, CURRENT_DATE)', [membroId])

      // Se a pessoa informou data do batismo, isso vira um registro no
      // Histórico Eclesiástico do membro (igual a qualquer outro membro).
      if (d.batizado_espirito_santo && d.data_batismo_espirito_santo) {
        await client.query(
          'INSERT INTO historicos (membro_id, tipo, data, localidade) VALUES ($1,$2,$3,$4)',
          [membroId, 'Batismo no Espírito Santo', d.data_batismo_espirito_santo, d.local_batismo_espirito_santo || null],
        )
      }
      if (d.batizado_aguas && d.data_batismo_aguas) {
        await client.query(
          'INSERT INTO historicos (membro_id, tipo, data, localidade) VALUES ($1,$2,$3,$4)',
          [membroId, 'Batismo nas Águas', d.data_batismo_aguas, d.local_batismo_aguas || null],
        )
      }
    }

    await client.query(
      `UPDATE cadastros_publicos SET status=$1, membro_id=$2, revisado_por=$3, revisado_em=NOW() WHERE id=$4`,
      [acao === 'aprovar' ? 'aprovado' : 'rejeitado', membroId, user.id, params.id],
    )

    await client.query('COMMIT')
    return Response.json({
      message: acao === 'aprovar' ? 'Cadastro aprovado — visitante criado!' : 'Cadastro rejeitado.',
      membro_id: membroId,
    })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}, { permission: 'recepcao' })

export const DELETE = withAuthParams<{ id: string }>(async (_req, user, { params }) => {
  const cad = await pool.query('SELECT congregacao_id FROM cadastros_publicos WHERE id = $1', [params.id])
  if (cad.rows.length === 0) return notFound('Cadastro não encontrado.')
  await assertCongregacaoNoEscopoDb(user, cad.rows[0].congregacao_id, pool)
  await pool.query('DELETE FROM cadastros_publicos WHERE id = $1', [params.id])
  return Response.json({ message: 'Cadastro removido.' })
}, { permission: 'recepcao' })
