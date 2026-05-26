import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { errorResponse } from '@/lib/api'

export async function POST(req: NextRequest) {
  try {
    const { email, senha } = await req.json()

    if (!email || !senha) {
      return Response.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    const result = await pool.query(
      `SELECT u.*, pa.permissoes
       FROM usuarios u
       LEFT JOIN perfis_acesso pa ON u.perfil_id = pa.id
       WHERE u.email = $1 AND u.ativo = TRUE`,
      [email],
    )
    if (result.rows.length === 0) {
      return Response.json({ error: 'Email ou senha inválidos' }, { status: 401 })
    }
    const usuario = result.rows[0]

    const senhaValida = await bcrypt.compare(senha, usuario.senha as string)
    if (!senhaValida) {
      return Response.json({ error: 'Email ou senha inválidos' }, { status: 401 })
    }

    // Limpeza oportunística de sessões expiradas — evita crescimento indefinido.
    await pool.query('DELETE FROM sessoes WHERE expira_em < NOW()')

    const token = uuidv4()
    const expiraEm = new Date()
    expiraEm.setHours(expiraEm.getHours() + 24)

    await pool.query(
      'INSERT INTO sessoes (usuario_id, token, expira_em) VALUES ($1, $2, $3)',
      [usuario.id, token, expiraEm],
    )
    await pool.query('UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1', [usuario.id])

    return Response.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        ativo: usuario.ativo,
        perfil_id: usuario.perfil_id ?? null,
        departamentos_acesso: usuario.departamentos_acesso ?? null,
        congregacoes_acesso: usuario.congregacoes_acesso ?? null,
        permissoes: usuario.permissoes ?? {},
      },
    })
  } catch (error) {
    return errorResponse(error)
  }
}
