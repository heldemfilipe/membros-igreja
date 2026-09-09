import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, ApiError } from '@/lib/api'
import { assertIgrejaNoEscopo } from '@/lib/scope'

/**
 * POST /api/recepcao/visitante
 * Cadastro rápido de visitante direto da tela de Recepção (permissão `recepcao`).
 * Cria o membro (tipo Visitante) + registra a visita e devolve os dados do
 * dirigente para o aviso no WhatsApp.
 */
export const POST = withAuth(async (req: NextRequest, user) => {
  const body = await req.json()
  const nome = (body.nome || '').trim()
  const igreja = (body.congregacao_nome || body.igreja || '').trim()
  if (!nome) throw new ApiError(400, 'Informe o nome do visitante.')
  if (!igreja) throw new ApiError(400, 'Informe a congregação.')

  await assertIgrejaNoEscopo(user, igreja, pool)

  const dataVisita = body.data_visita || new Date().toISOString().split('T')[0]
  const obs = (body.observacoes || '').trim() || null

  // Tudo na MESMA conexão (o pool é max:1 em serverless — não dá para abrir
  // um segundo pool.query enquanto a transação segura a conexão).
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const m = await client.query(
      `INSERT INTO membros (nome, telefone_principal, informacoes_complementares, tipo_participante, igreja)
       VALUES ($1,$2,$3,'Visitante',$4) RETURNING id`,
      [nome, (body.telefone_principal || '').trim() || null, obs, igreja],
    )
    const membroId = m.rows[0].id
    await client.query(
      'INSERT INTO visitas (membro_id, data_visita, observacoes) VALUES ($1,$2,$3)',
      [membroId, dataVisita, obs],
    )

    const cong = await client.query(
      `SELECT c.notificar_whatsapp, dm.nome AS dirigente_nome,
              COALESCE(NULLIF(dm.telefone_principal, ''), c.dirigente_telefone) AS dirigente_telefone
       FROM congregacoes c
       LEFT JOIN membros dm ON dm.id = c.dirigente_membro_id
       WHERE c.nome = $1`,
      [igreja],
    )

    await client.query('COMMIT')

    const row = cong.rows[0]
    return Response.json({
      id: membroId,
      message: 'Visitante registrado!',
      dirigente: row
        ? {
            nome: row.dirigente_nome || null,
            telefone: row.notificar_whatsapp !== false ? (row.dirigente_telefone || null) : null,
          }
        : null,
    })
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}, { permission: 'recepcao' })
