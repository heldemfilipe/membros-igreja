import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, ApiError } from '@/lib/api'
import { forbidden, notFound } from '@/lib/auth'
import { buildAccessWhere } from '@/lib/access'

// GET /api/membros/registros?campo=nascimento|casamento&congregacao=&status=todos|com|sem&search=
export const GET = withAuth(async (req: NextRequest, user) => {
  const podeVer = user.tipo === 'admin' || user.permissoes.registros_ver || user.permissoes.registros_editar
  if (!podeVer) return forbidden()

  const { searchParams } = new URL(req.url)
  const campo = searchParams.get('campo') === 'casamento' ? 'data_casamento' : 'data_nascimento'
  const status = searchParams.get('status') || 'todos' // todos | com | sem
  const search = searchParams.get('search') || ''
  const congregacaoParam = searchParams.get('congregacao')

  const { where: accessWhere, params: accessParams, empty } = buildAccessWhere(user, congregacaoParam, { tableAlias: 'm' })
  if (empty) return Response.json({ total: 0, com_data: 0, sem_data: 0, porcentagem: 0, membros: [] })

  const params: unknown[] = [...accessParams]
  let where = accessWhere

  if (campo === 'data_casamento') {
    where += ` AND (m.estado_civil = 'Casado(a)' OR EXISTS (
      SELECT 1 FROM familiares f WHERE f.membro_id = m.id AND f.parentesco = 'Cônjuge'
    ))`
  }

  if (status === 'com') where += ` AND m.${campo} IS NOT NULL`
  else if (status === 'sem') where += ` AND m.${campo} IS NULL`

  if (search.trim()) {
    params.push(`%${search.trim()}%`)
    where += ` AND (unaccent(m.nome) ILIKE unaccent($${params.length}) OR unaccent(m.conhecido_como) ILIKE unaccent($${params.length}))`
  }

  const membrosRes = await pool.query(
    `SELECT m.id, m.nome, m.conhecido_como, m.tipo_participante, m.sexo,
            m.data_nascimento, m.data_casamento, m.igreja, m.telefone_principal
     FROM membros m
     WHERE 1=1 ${where}
     ORDER BY m.nome ASC`,
    params,
  )

  const membros = membrosRes.rows
  const total = membros.length
  const com_data = membros.filter(m => m[campo] !== null).length
  const sem_data = total - com_data
  const porcentagem = total > 0 ? Math.round((com_data / total) * 100) : 0

  return Response.json({ total, com_data, sem_data, porcentagem, membros })
})

// PATCH /api/membros/registros — atualiza data_nascimento ou data_casamento de um membro
export const PATCH = withAuth(async (req: NextRequest, user) => {
  const podeEditar = user.tipo === 'admin' || user.permissoes.registros_editar
  if (!podeEditar) return forbidden('Sem permissão para editar registros.')

  const { id, campo, valor } = await req.json()

  if (!id || !campo) throw new ApiError(400, 'id e campo são obrigatórios.')
  if (campo !== 'data_nascimento' && campo !== 'data_casamento') {
    throw new ApiError(400, 'campo deve ser data_nascimento ou data_casamento.')
  }

  const result = await pool.query(
    `UPDATE membros SET ${campo} = $1 WHERE id = $2 RETURNING id, nome, data_nascimento, data_casamento`,
    [valor || null, id],
  )
  if (result.rowCount === 0) return notFound('Membro não encontrado.')

  // Se atualizou data_casamento, propaga para o cônjuge vinculado (se ele não tiver)
  if (campo === 'data_casamento' && valor) {
    await pool.query(
      `UPDATE membros SET data_casamento = $1
       WHERE id IN (
         SELECT membro_vinculado_id FROM familiares
         WHERE membro_id = $2 AND parentesco = 'Cônjuge' AND membro_vinculado_id IS NOT NULL
       ) AND data_casamento IS NULL`,
      [valor, id],
    )
  }

  return Response.json(result.rows[0])
})
