import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  const { searchParams } = new URL(req.url)
  const mes = searchParams.get('mes') || String(new Date().getMonth() + 1)

  // Restrições por departamento e congregação
  const deptoAcesso = user.departamentos_acesso && user.departamentos_acesso.length > 0
    ? user.departamentos_acesso : null
  const congAcesso = user.congregacoes_acesso && user.congregacoes_acesso.length > 0
    ? user.congregacoes_acesso : null

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const params: any[] = [mes]
    let extraWhere = ''

    if (deptoAcesso) {
      extraWhere += ` AND id IN (SELECT membro_id FROM membro_departamentos WHERE departamento_id = ANY($${params.length + 1}::int[]))`
      params.push(deptoAcesso)
    }
    if (congAcesso) {
      extraWhere += ` AND igreja IN (SELECT nome FROM congregacoes WHERE id = ANY($${params.length + 1}::int[]))`
      params.push(congAcesso)
    }

    const result = await pool.query(
      `SELECT id, nome, conhecido_como, data_nascimento, telefone_principal, tipo_participante, cargo
       FROM membros
       WHERE EXTRACT(MONTH FROM data_nascimento) = $1${extraWhere}
       ORDER BY EXTRACT(DAY FROM data_nascimento)`,
      params
    )
    return Response.json(result.rows)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
