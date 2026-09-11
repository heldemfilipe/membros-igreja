import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth } from '@/lib/api'

/**
 * Configuração (linha única) de quais blocos aparecem no formulário público
 * de autocadastro. Só o admin geral mexe — afeta o que qualquer visitante
 * pode enviar por um link sem login.
 */
export const GET = withAuth(async () => {
  const result = await pool.query('SELECT * FROM formulario_publico_config WHERE id = 1')
  const { id: _id, ...campos } = result.rows[0] || {}
  return Response.json(campos)
}, { adminOnly: true })

export const PUT = withAuth(async (req: NextRequest) => {
  const body = await req.json()
  const b = (v: unknown) => v === true

  const result = await pool.query(
    `UPDATE formulario_publico_config SET
       endereco=$1, nascimento=$2, estado_civil=$3, escolaridade_area=$4,
       dons_talentos=$5, vida_espiritual=$6, origem_religiosa=$7,
       desafios_pessoais=$8, convidado_por=$9, observacoes=$10
     WHERE id = 1 RETURNING *`,
    [
      b(body.endereco), b(body.nascimento), b(body.estado_civil), b(body.escolaridade_area),
      b(body.dons_talentos), b(body.vida_espiritual), b(body.origem_religiosa),
      b(body.desafios_pessoais), b(body.convidado_por), b(body.observacoes),
    ],
  )
  const { id: _id, ...campos } = result.rows[0]
  return Response.json(campos)
}, { adminOnly: true })
