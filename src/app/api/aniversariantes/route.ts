import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  const { searchParams } = new URL(req.url)
  const mes = searchParams.get('mes') || String(new Date().getMonth() + 1)

  // Restrição por departamentos
  const deptoAcesso = user.departamentos_acesso && user.departamentos_acesso.length > 0
    ? user.departamentos_acesso : null

  try {
    const params: (string | number[])[] = [mes]
    let deptWhere = ''
    if (deptoAcesso) {
      deptWhere = ` AND id IN (SELECT membro_id FROM membro_departamentos WHERE departamento_id = ANY($2::int[]))`
      params.push(deptoAcesso)
    }

    const result = await pool.query(
      `SELECT id, nome, conhecido_como, data_nascimento, telefone_principal, tipo_participante, cargo
       FROM membros
       WHERE EXTRACT(MONTH FROM data_nascimento) = $1${deptWhere}
       ORDER BY EXTRACT(DAY FROM data_nascimento)`,
      params
    )
    return Response.json(result.rows)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
