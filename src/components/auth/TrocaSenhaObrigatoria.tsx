"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KeyRound, Loader2, LogOut, Eye, EyeOff } from 'lucide-react'

/**
 * Tela bloqueante exibida quando `usuario.deve_trocar_senha` é verdadeiro.
 * O usuário não acessa o restante do sistema até definir uma nova senha
 * (ou sair). Após trocar, o flag some e a tela não aparece mais — a não ser
 * que um admin reative a exigência.
 */
export function TrocaSenhaObrigatoria() {
  const { token, atualizarUsuario, logout } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')

  const submeter = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (novaSenha.length < 6) {
      setErro('A nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (novaSenha !== confirmar) {
      setErro('A confirmação não confere com a nova senha.')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/auth/trocar-senha', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.error || 'Não foi possível alterar a senha.')
        return
      }
      atualizarUsuario({ deve_trocar_senha: false })
      toast({ title: '✓ Senha alterada com sucesso!' })
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const sair = async () => {
    await logout()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-background pointer-events-none" />
      <div className="relative w-full max-w-[420px] space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary shadow-lg shadow-primary/30">
            <KeyRound className="h-7 w-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Defina uma nova senha</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Por segurança, você precisa trocar a senha antes de continuar.
            </p>
          </div>
        </div>

        <form onSubmit={submeter} className="rounded-2xl border bg-card shadow-xl shadow-black/10 p-6 sm:p-8 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tso-atual">Senha atual</Label>
            <Input
              id="tso-atual"
              type={show ? 'text' : 'password'}
              value={senhaAtual}
              onChange={e => setSenhaAtual(e.target.value)}
              placeholder="A senha que você usou para entrar"
              autoComplete="current-password"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tso-nova">Nova senha</Label>
            <div className="relative">
              <Input
                id="tso-nova"
                type={show ? 'text' : 'password'}
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
                className="pr-11"
              />
              <button
                type="button"
                onClick={() => setShow(s => !s)}
                tabIndex={-1}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tso-conf">Confirmar nova senha</Label>
            <Input
              id="tso-conf"
              type={show ? 'text' : 'password'}
              value={confirmar}
              onChange={e => setConfirmar(e.target.value)}
              placeholder="Repita a nova senha"
              autoComplete="new-password"
            />
          </div>

          {erro && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              <span>⚠</span>
              <span>{erro}</span>
            </div>
          )}

          <Button type="submit" disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
            {saving ? 'Salvando...' : 'Salvar nova senha'}
          </Button>

          <button
            type="button"
            onClick={sair}
            className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors pt-1"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sair
          </button>
        </form>
      </div>
    </div>
  )
}
