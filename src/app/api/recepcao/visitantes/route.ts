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
            COALESCE(av.voltou_culto, false)      AS voltou_culto,
            av.voltou_culto_data::text            AS voltou_culto_data,
            av.visita_casa_data::text             AS visita_casa_data,
            COALESCE(av.visita_casa_feita, false) AS visita_casa_feita,
            COALESCE(av.discipulado, false)       AS discipulado,
            av.discipulador, av.observacoes,
            COUNT(v.id)::int          AS total_visitas,
            MAX(v.data_visita)::text  AS ultima_visita,
            MIN(v.data_visita)::text  AS primeira_visita
     FROM membros m
     LEFT JOIN acompanhamento_visitante av ON av.membro_id = m.id
     LEFT JOIN visitas v ON v.membro_id = m.id
     WHERE m.tipo_participante = 'Visitante' AND m.ativo = TRUE${where}
     GROUP BY m.id, m.nome, m.telefone_principal, m.igreja,
              av.voltou_culto, av.voltou_culto_data, av.visita_casa_data, av.visita_casa_feita,
              av.discipulado, av.discipulador, av.observacoes
     ORDER BY MAX(v.data_visita) DESC NULLS LAST, m.nome
     LIMIT 200`,
    params,
  )
  return Response.json(result.rows)
}, { permission: 'recepcao' })
