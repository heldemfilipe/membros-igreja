import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  const { searchParams } = new URL(req.url)
  const mes = searchParams.get('mes') || String(new Date().getMonth() + 1)
  const congregacaoParam = searchParams.get('congregacao')

  const deptoAcesso = user.departamentos_acesso && user.departamentos_acesso.length > 0
    ? user.departamentos_acesso : null
  const congAcesso = user.congregacoes_acesso && user.congregacoes_acesso.length > 0
    ? user.congregacoes_acesso : null

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [mes]
    let extraWhere = ''

    if (deptoAcesso) {
      extraWhere += ` AND m.id IN (SELECT membro_id FROM membro_departamentos WHERE departamento_id = ANY($${params.length + 1}::int[]))`
      params.push(deptoAcesso)
    }
    if (congAcesso) {
      const effective = congregacaoParam
        ? congAcesso.filter((id: number) => id === parseInt(congregacaoParam))
        : congAcesso
      extraWhere += ` AND m.igreja IN (SELECT nome FROM congregacoes WHERE id = ANY($${params.length + 1}::int[]))`
      params.push(effective)
    } else if (congregacaoParam) {
      extraWhere += ` AND m.igreja IN (SELECT nome FROM congregacoes WHERE id = $${params.length + 1})`
      params.push(parseInt(congregacaoParam))
    }

    const result = await pool.query(
      `WITH casamentos AS (
        SELECT
          m.id, m.nome, m.data_casamento, m.sexo,
          m.telefone_principal, m.tipo_participante, m.igreja,
          f.membro_vinculado_id AS conjuge_id,
          mc.nome AS conjuge_nome
        FROM membros m
        LEFT JOIN familiares f
          ON f.membro_id = m.id
          AND f.parentesco = 'Cônjuge'
          AND f.membro_vinculado_id IS NOT NULL
        LEFT JOIN membros mc ON mc.id = f.membro_vinculado_id
        WHERE m.data_casamento IS NOT NULL
          AND EXTRACT(MONTH FROM m.data_casamento) = $1
          ${extraWhere}
      )
      SELECT * FROM casamentos
      WHERE conjuge_id IS NULL OR id < conjuge_id
      ORDER BY EXTRACT(DAY FROM data_casamento)`,
      params
    )
    return Response.json(result.rows)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
