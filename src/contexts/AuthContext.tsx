"use client"

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import { Permissoes } from '@/types'

interface UsuarioBasico {
  id: number
  nome: string
  email: string
  tipo: 'admin' | 'usuario'
  ativo: boolean
  perfil_id?: number | null
  departamentos_acesso?: number[] | null
  permissoes?: Permissoes
}

interface AuthContextType {
  user: UsuarioBasico | null
  token: string | null
  isAdmin: boolean
  loading: boolean
  permissoes: Permissoes
  departamentosAcesso: number[] | null
  temPermissao: (chave: string) => boolean
  login: (token: string, usuario: UsuarioBasico) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAdmin: false,
  loading: true,
  permissoes: {},
  departamentosAcesso: null,
  temPermissao: () => false,
  login: () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UsuarioBasico | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('token')
    if (!storedToken) {
      setLoading(false)
      return
    }

    fetch('/api/auth/verify', {
      headers: { Authorization: `Bearer ${storedToken}` },
    })
      .then(res => {
        if (!res.ok) throw new Error('Token inválido')
        return res.json()
      })
      .then(data => {
        setToken(storedToken)
        setUser(data.usuario)
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('usuario')
      })
      .finally(() => setLoading(false))
  }, [])

  const login = (newToken: string, usuario: UsuarioBasico) => {
    localStorage.setItem('token', newToken)
    localStorage.setItem('usuario', JSON.stringify(usuario))
    setToken(newToken)
    setUser(usuario)
  }

  const logout = async () => {
    try {
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      }
    } catch {
      // ignora
    } finally {
      localStorage.removeItem('token')
      localStorage.removeItem('usuario')
      setToken(null)
      setUser(null)
    }
  }

  const isAdmin = user?.tipo === 'admin'
  const permissoes: Permissoes = user?.permissoes || {}
  const departamentosAcesso: number[] | null = user?.departamentos_acesso || null

  const temPermissao = useCallback((chave: string): boolean => {
    if (!user) return false
    // Admin tem acesso total
    if (user.tipo === 'admin') return true
    // Sem perfil atribuído: acesso total (compatibilidade retroativa)
    if (!user.perfil_id) return true
    // Com perfil: verifica permissão específica
    return !!permissoes[chave]
  }, [user, permissoes])

  return (
    <AuthContext.Provider value={{ user, token, isAdmin, loading, permissoes, departamentosAcesso, temPermissao, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
