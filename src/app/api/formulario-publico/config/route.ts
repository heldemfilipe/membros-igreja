import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, ApiError } from '@/lib/api'
import { assertCongregacaoNoEscopoDb } from '@/lib/scope'
import { FORMULARIO_PUBLICO_CONFIG_PADRAO } from '@/lib/constants'

/**
 * Configuração de quais blocos aparecem no formulário público de
 * autocadastro — uma linha por congregação. Quem tem a permissão
 * `cadastro_publico` só enxerga/edita a config da(s) sua(s) congregação(ões)
 * (igual a qualquer outra tela escopada por congregação nesta app).
 */
export const GET = withAuth(async (req: NextRequest, user) => {
  const congId = Number(new URL(req.url).searchParams.get('congregacao_id'))
  if (!congId) throw new ApiError(400, 'Informe a congregação.')
  await assertCongregacaoNoEscopoDb(user, congId, pool)

  const result = await pool.query('SELECT * FROM formulario_publico_config WHERE congregacao_id = $1', [congId])
  const { congregacao_id: _cid, ...campos } = result.rows[0] || { ...FORMULARIO_PUBLICO_CONFIG_PADRAO, congregacao_id: congId }
  return Response.json(campos)
}, { permission: 'cadastro_publico' })

export const PUT = withAuth(async (req: NextRequest, user) => {
  const body = await req.json()
  const congId = Number(body.congregacao_id)
  if (!congId) throw new ApiError(400, 'Informe a congregação.')
  await assertCongregacaoNoEscopoDb(user, congId, pool)

  const b = (v: unknown) => v === true
  const result = await pool.query(
    `INSERT INTO formulario_publico_config (
       congregacao_id, endereco, nascimento, estado_civil, escolaridade_area,
       dons_talentos, vida_espiritual, origem_religiosa, documentos,
       desafios_pessoais, convidado_por, observacoes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     ON CONFLICT (congregacao_id) DO UPDATE SET
       endereco=$2, nascimento=$3, estado_civil=$4, escolaridade_area=$5,
       dons_talentos=$6, vida_espiritual=$7, origem_religiosa=$8, documentos=$9,
       desafios_pessoais=$10, convidado_por=$11, observacoes=$12
     RETURNING *`,
    [
      congId, b(body.endereco), b(body.nascimento), b(body.estado_civil), b(body.escolaridade_area),
      b(body.dons_talentos), b(body.vida_espiritual), b(body.origem_religiosa), b(body.documentos),
      b(body.desafios_pessoais), b(body.convidado_por), b(body.observacoes),
    ],
  )
  const { congregacao_id: _cid, ...campos } = result.rows[0]
  return Response.json(campos)
}, { permission: 'cadastro_publico' })
