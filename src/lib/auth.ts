import { NextRequest } from 'next/server'
import pool from './db'
import { Permissoes } from '@/types'

export interface AuthUser {
  id: number
  nome: string
  email: string
  tipo: 'admin' | 'usuario'
  ativo?: boolean
  permissoes: Permissoes
  departamentos_acesso: number[] | null
  perfil_id?: number | null
}

export async function verificarToken(req: NextRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return null

  const token = authHeader.replace('Bearer ', '')

  try {
    // Tenta query completa com join em perfis_acesso
    const result = await pool.query(
      `SELECT s.*, u.id as user_id, u.nome, u.email, u.tipo, u.ativo,
              u.perfil_id, u.departamentos_acesso,
              pa.permissoes
       FROM sessoes s
       JOIN usuarios u ON s.usuario_id = u.id
       LEFT JOIN perfis_acesso pa ON u.perfil_id = pa.id
       WHERE s.token = $1 AND s.expira_em > NOW()`,
      [token]
    )

    if (result.rows.length === 0) return null
    const sessao = result.rows[0]
    if (!sessao.ativo) return null

    return {
      id: sessao.user_id,
      nome: sessao.nome,
      email: sessao.email,
      tipo: sessao.tipo,
      ativo: sessao.ativo,
      permissoes: sessao.permissoes || {},
      departamentos_acesso: sessao.departamentos_acesso || null,
      perfil_id: sessao.perfil_id || null,
    }
  } catch {
    // Fallback sem colunas de perfil (antes da migração)
    try {
      const result = await pool.query(
        `SELECT s.*, u.id as user_id, u.nome, u.email, u.tipo, u.ativo
         FROM sessoes s
         JOIN usuarios u ON s.usuario_id = u.id
         WHERE s.token = $1 AND s.expira_em > NOW()`,
        [token]
      )
      if (result.rows.length === 0) return null
      const sessao = result.rows[0]
      if (!sessao.ativo) return null
      return {
        id: sessao.user_id,
        nome: sessao.nome,
        email: sessao.email,
        tipo: sessao.tipo,
        ativo: sessao.ativo,
        permissoes: {},
        departamentos_acesso: null,
        perfil_id: null,
      }
    } catch {
      return null
    }
  }
}

export function unauthorized(msg = 'Token inválido ou expirado') {
  return Response.json({ error: msg }, { status: 401 })
}

export function forbidden(msg = 'Acesso negado. Apenas administradores.') {
  return Response.json({ error: msg }, { status: 403 })
}
