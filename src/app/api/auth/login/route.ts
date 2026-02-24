import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  const { email, senha } = await req.json()

  if (!email || !senha) {
    return Response.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
  }

  try {
    let usuario: Record<string, unknown>
    let permissoes: Record<string, boolean> = {}
    let departamentos_acesso: number[] | null = null
    let perfil_id: number | null = null

    try {
      // Busca usuário com perfil de acesso
      const result = await pool.query(
        `SELECT u.*, pa.permissoes, pa.id as pa_id
         FROM usuarios u
         LEFT JOIN perfis_acesso pa ON u.perfil_id = pa.id
         WHERE u.email = $1 AND u.ativo = TRUE`,
        [email]
      )
      if (result.rows.length === 0) {
        return Response.json({ error: 'Email ou senha inválidos' }, { status: 401 })
      }
      usuario = result.rows[0]
      permissoes = usuario.permissoes as Record<string, boolean> || {}
      departamentos_acesso = usuario.departamentos_acesso as number[] | null || null
      perfil_id = usuario.perfil_id as number | null || null
    } catch {
      // Fallback sem colunas de perfil
      const result = await pool.query(
        'SELECT * FROM usuarios WHERE email = $1 AND ativo = TRUE',
        [email]
      )
      if (result.rows.length === 0) {
        return Response.json({ error: 'Email ou senha inválidos' }, { status: 401 })
      }
      usuario = result.rows[0]
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha as string)

    if (!senhaValida) {
      return Response.json({ error: 'Email ou senha inválidos' }, { status: 401 })
    }

    const token = uuidv4()
    const expiraEm = new Date()
    expiraEm.setHours(expiraEm.getHours() + 24)

    await pool.query(
      'INSERT INTO sessoes (usuario_id, token, expira_em) VALUES ($1, $2, $3)',
      [usuario.id, token, expiraEm]
    )

    await pool.query(
      'UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1',
      [usuario.id]
    )

    return Response.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
        ativo: usuario.ativo,
        perfil_id,
        departamentos_acesso,
        permissoes,
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
