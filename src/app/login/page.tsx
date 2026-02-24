"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Church, Eye, EyeOff, LogIn, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

export default function LoginPage() {
  const router = useRouter()
  const { user, loading, login } = useAuth()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard')
    }
  }, [user, loading, router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !senha) {
      setError('Preencha email e senha.')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao fazer login.')
        return
      }

      login(data.token, data.usuario)
      router.replace('/dashboard')
    } catch {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background pointer-events-none" />

      <div className="relative w-full max-w-[400px] space-y-6">
        {/* Logo */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary shadow-lg shadow-primary/30">
            <Church className="h-8 w-8 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Igreja</h1>
            <p className="text-muted-foreground text-sm mt-1">Sistema de Membros</p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-card shadow-xl shadow-black/10 overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-primary via-primary/70 to-primary/30" />

          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold">Bem-vindo</h2>
              <p className="text-sm text-muted-foreground">Faça login para acessar o sistema</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">E-mail</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@igreja.com"
                  autoComplete="email"
                  disabled={submitting}
                  className="w-full px-4 py-2.5 rounded-lg border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="senha" className="text-sm font-medium">Senha</label>
                <div className="relative">
                  <input
                    id="senha"
                    type={showSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={submitting}
                    className="w-full px-4 py-2.5 pr-11 rounded-lg border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary disabled:opacity-50 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Entrando...</>
                ) : (
                  <><LogIn className="h-4 w-4" />Entrar</>
                )}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Sistema de Gestão de Membros — Acesso restrito
        </p>
      </div>
    </div>
  )
}
