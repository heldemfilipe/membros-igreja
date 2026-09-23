import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth } from '@/lib/api'
import { buildAccessWhere } from '@/lib/access'

/**
 * GET /api/recepcao/visitantes
 * Visitantes com estatísticas de visita + checklist de acompanhamento.
 * Respeita o escopo de acesso do usuário.
 */
export const GET = withAuth(async (req: NextRequest, user) => {
  const { searchParams } = new URL(req.url)
  const congregacaoParam = searchParams.get('congregacao')

  const { where, params, empty } = buildAccessWhere(user, congregacaoParam, { tableAlias: 'm' })
  if (empty) return Response.json([])

  const result = await pool.query(
    `SELECT m.id AS membro_id, m.nome, m.telefone_principal, m.igreja,
            m.email, m.informacoes_complementares,
            m.origem_religiosa, m.origem_religiosa_detalhe,
            m.data_nascimento::text AS data_nascimento,
            COALESCE(av.contato_feito, false)     AS contato_feito,
            av.contato_por,
            av.contato_data::text                 AS contato_data,
            COALESCE(av.visita_agendada, false)   AS visita_agendada,
            av.visita_agendada_por,
            av.visita_casa_data::text             AS visita_casa_data,
            COALESCE(av.visita_casa_feita, false) AS visita_casa_feita,
            COALESCE(av.voltou_culto, false)      AS voltou_culto,
            av.voltou_culto_data::text            AS voltou_culto_data,
            COALESCE(av.discipulado, false)       AS discipulado,
            av.discipulado_inicio::text           AS discipulado_inicio,
            av.discipulador,
            COALESCE(av.batizado, false)          AS batizado,
            av.congregacao_origem,
            av.convidado_por,
            av.observacoes,
            COALESCE(vs.total_visitas, 0)         AS total_visitas,
            vs.ultima_visita, vs.primeira_visita
     FROM membros m
     LEFT JOIN acompanhamento_visitante av ON av.membro_id = m.id
     LEFT JOIN (
       SELECT membro_id, COUNT(*)::int AS total_visitas,
              MAX(data_visita)::text AS ultima_visita,
              MIN(data_visita)::text AS primeira_visita
       FROM visitas GROUP BY membro_id
     ) vs ON vs.membro_id = m.id
     WHERE m.tipo_participante = 'Visitante' AND m.ativo = TRUE${where}
     ORDER BY vs.ultima_visita DESC NULLS LAST, m.nome
     LIMIT 200`,
    params,
  )
  return Response.json(result.rows)
}, { permission: 'recepcao' })
