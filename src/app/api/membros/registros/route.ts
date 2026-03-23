import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized, forbidden } from '@/lib/auth'
import { buildAccessWhere } from '@/lib/access'

// GET /api/membros/registros?campo=nascimento|casamento&congregacao=&status=todos|com|sem&search=
export async function GET(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  const podeVer = user.tipo === 'admin' ||
    (user.permissoes as Record<string, boolean>)?.registros_ver ||
    (user.permissoes as Record<string, boolean>)?.registros_editar
  if (!podeVer) return forbidden()

  const { searchParams } = new URL(req.url)
  const campo = searchParams.get('campo') === 'casamento' ? 'data_casamento' : 'data_nascimento'
  const status = searchParams.get('status') || 'todos'   // todos | com | sem
  const search = searchParams.get('search') || ''
  const congregacaoParam = searchParams.get('congregacao')

  const { where: accessWhere, params: accessParams, empty } = buildAccessWhere(user, congregacaoParam)
  if (empty) return Response.json({ total: 0, com_data: 0, sem_data: 0, porcentagem: 0, membros: [] })

  const client = await pool.connect()
  try {
    const params: unknown[] = [...accessParams]
    let where = accessWhere

    // Aba casamento: mostrar apenas casados (ou quem tem cônjuge vinculado)
    if (campo === 'data_casamento') {
      where += ` AND (m.estado_civil = 'Casado(a)' OR EXISTS (
        SELECT 1 FROM familiares f WHERE f.membro_id = m.id AND f.parentesco = 'Cônjuge'
      ))`
    }

    if (status === 'com') {
      where += ` AND m.${campo} IS NOT NULL`
    } else if (status === 'sem') {
      where += ` AND m.${campo} IS NULL`
    }

    if (search.trim()) {
      params.push(`%${search.trim()}%`)
      where += ` AND (m.nome ILIKE $${params.length} OR m.conhecido_como ILIKE $${params.length})`
    }

    const membrosRes = await client.query(
      `SELECT m.id, m.nome, m.conhecido_como, m.tipo_participante, m.sexo,
              m.data_nascimento, m.data_casamento, m.igreja, m.telefone_principal
       FROM membros m
       WHERE 1=1 ${where}
       ORDER BY m.nome ASC`,
      params
    )

    const membros = membrosRes.rows
    const total = membros.length
    const com_data = membros.filter(m => m[campo] !== null).length
    const sem_data = total - com_data
    const porcentagem = total > 0 ? Math.round((com_data / total) * 100) : 0

    return Response.json({ total, com_data, sem_data, porcentagem, membros })
  } finally {
    client.release()
  }
}

// PATCH /api/membros/registros — atualiza data_nascimento ou data_casamento de um membro
export async function PATCH(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  const podeEditar = user.tipo === 'admin' ||
    (user.permissoes as Record<string, boolean>)?.registros_editar
  if (!podeEditar) return forbidden('Sem permissão para editar registros.')

  const { id, campo, valor } = await req.json()

  if (!id || !campo) return Response.json({ error: 'id e campo são obrigatórios.' }, { status: 400 })
  if (campo !== 'data_nascimento' && campo !== 'data_casamento') {
    return Response.json({ error: 'campo deve ser data_nascimento ou data_casamento.' }, { status: 400 })
  }

  const client = await pool.connect()
  try {
    const result = await client.query(
      `UPDATE membros SET ${campo} = $1 WHERE id = $2 RETURNING id, nome, data_nascimento, data_casamento`,
      [valor || null, id]
    )
    if (result.rowCount === 0) return Response.json({ error: 'Membro não encontrado.' }, { status: 404 })

    // Se atualizou data_casamento, propaga para o cônjuge vinculado (se ele não tiver)
    if (campo === 'data_casamento' && valor) {
      await client.query(
        `UPDATE membros SET data_casamento = $1
         WHERE id IN (
           SELECT membro_vinculado_id FROM familiares
           WHERE membro_id = $2 AND parentesco = 'Cônjuge' AND membro_vinculado_id IS NOT NULL
         ) AND data_casamento IS NULL`,
        [valor, id]
      )
    }

    return Response.json(result.rows[0])
  } finally {
    client.release()
  }
}
