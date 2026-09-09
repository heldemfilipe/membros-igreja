"use client"

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  UserCircle, Shield, Lock, KeyRound, Loader2, Check, Pencil, Church, Building2, Eye, EyeOff,
} from 'lucide-react'

export default function MinhaContaPage() {
  const { user, token, isAdmin, atualizarUsuario } = useAuth()
  const { toast } = useToast()

  // ─── Nome ────────────────────────────────────────────────────────────────
  const [editandoNome, setEditandoNome] = useState(false)
  const [nome, setNome] = useState(user?.nome ?? '')
  const [salvandoNome, setSalvandoNome] = useState(false)

  useEffect(() => { setNome(user?.nome ?? '') }, [user?.nome])

  const salvarNome = async () => {
    const limpo = nome.trim()
    if (!limpo) { toast({ title: 'O nome não pode ficar em branco.', variant: 'destructive' }); return }
    setSalvandoNome(true)
    try {
      const res = await fetch('/api/auth/perfil', {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: limpo }),
      })
      const data = await res.json()
      if (!res.ok) { toast({ title: data.error || 'Erro ao salvar.', variant: 'destructive' }); return }
      atualizarUsuario({ nome: limpo })
      setEditandoNome(false)
      toast({ title: 'Nome atualizado!' })
    } finally {
      setSalvandoNome(false)
    }
  }

  // ─── Escopo (congregações / departamentos) ───────────────────────────────
  const [congregacoes, setCongregacoes] = useState<{ id: number; nome: string }[]>([])
  const [departamentos, setDepartamentos] = useState<{ id: number; nome: string }[]>([])

  useEffect(() => {
    if (!token) return
    fetch('/api/congregacoes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : []).then(setCongregacoes).catch(() => {})
    fetch('/api/departamentos', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : []).then(setDepartamentos).catch(() => {})
  }, [token])

  const congAcesso = user?.congregacoes_acesso ?? null
  const deptAcesso = user?.departamentos_acesso ?? null

  const nomesCongregacoes = useMemo(() => {
    if (!congAcesso?.length) return null
    return congAcesso.map(id => congregacoes.find(c => c.id === id)?.nome || `#${id}`)
  }, [congAcesso, congregacoes])

  const nomesDepartamentos = useMemo(() => {
    if (!deptAcesso?.length) return null
    return deptAcesso.map(id => departamentos.find(d => d.id === id)?.nome || `#${id}`)
  }, [deptAcesso, departamentos])

  const papel = isAdmin
    ? 'Administrador'
    : user?.perfil_id ? 'Acesso restrito por perfil' : 'Acesso total'

  // ─── Alterar senha ───────────────────────────────────────────────────────
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [show, setShow] = useState(false)
  const [salvandoSenha, setSalvandoSenha] = useState(false)

  const alterarSenha = async (e: React.FormEvent) => {
    e.preventDefault()
    if (novaSenha.length < 6) {
      toast({ title: 'A nova senha deve ter pelo menos 6 caracteres.', variant: 'destructive' }); return
    }
    if (novaSenha !== confirmar) {
      toast({ title: 'A confirmação não confere.', variant: 'destructive' }); return
    }
    setSalvandoSenha(true)
    try {
      const res = await fetch('/api/auth/trocar-senha', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ senhaAtual, novaSenha }),
      })
      const data = await res.json()
      if (!res.ok) { toast({ title: data.error || 'Erro ao alterar senha.', variant: 'destructive' }); return }
      atualizarUsuario({ deve_trocar_senha: false })
      setSenhaAtual(''); setNovaSenha(''); setConfirmar('')
      toast({ title: '✓ Senha alterada com sucesso!' })
    } finally {
      setSalvandoSenha(false)
    }
  }

  const iniciais = user?.nome
    ? user.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : '?'

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserCircle className="h-6 w-6" />
          Minha Conta
        </h1>
        <p className="text-muted-foreground text-sm">Seus dados de acesso e segurança</p>
      </div>

      {/* ─── Dados da conta ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dados da conta</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center text-lg font-bold text-primary shrink-0">
              {iniciais}
            </div>
            <div className="flex items-center gap-2">
              {isAdmin
                ? <Badge className="gap-1"><Shield className="h-3 w-3" />{papel}</Badge>
                : <Badge variant="secondary" className="gap-1"><Lock className="h-3 w-3" />{papel}</Badge>}
            </div>
          </div>

          {/* Nome */}
          <div className="space-y-2">
            <Label>Nome</Label>
            {editandoNome ? (
              <div className="flex gap-2">
                <Input value={nome} onChange={e => setNome(e.target.value)} autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') salvarNome(); if (e.key === 'Escape') { setEditandoNome(false); setNome(user?.nome ?? '') } }} />
                <Button onClick={salvarNome} disabled={salvandoNome} size="icon" className="shrink-0">
                  {salvandoNome ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button variant="outline" size="sm" className="shrink-0"
                  onClick={() => { setEditandoNome(false); setNome(user?.nome ?? '') }}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{user?.nome}</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditandoNome(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>

          {/* E-mail */}
          <div className="space-y-2">
            <Label>E-mail (login)</Label>
            <div className="h-10 px-3 rounded-md border border-input bg-muted flex items-center gap-2 text-sm">
              <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span>{user?.email}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Para alterar o e-mail, peça a um administrador.
            </p>
          </div>

          {/* Escopo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Church className="h-3.5 w-3.5" />Congregações</Label>
              {nomesCongregacoes ? (
                <div className="flex flex-wrap gap-1.5">
                  {nomesCongregacoes.map(n => <Badge key={n} variant="outline" className="text-xs">{n}</Badge>)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Todas as congregações</p>
              )}
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" />Departamentos</Label>
              {nomesDepartamentos ? (
                <div className="flex flex-wrap gap-1.5">
                  {nomesDepartamentos.map(n => <Badge key={n} variant="outline" className="text-xs">{n}</Badge>)}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Todos os departamentos</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Segurança ──────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            Alterar senha
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={alterarSenha} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mc-atual">Senha atual</Label>
              <Input id="mc-atual" type={show ? 'text' : 'password'} value={senhaAtual}
                onChange={e => setSenhaAtual(e.target.value)} autoComplete="current-password" placeholder="••••••••" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mc-nova">Nova senha</Label>
                <div className="relative">
                  <Input id="mc-nova" type={show ? 'text' : 'password'} value={novaSenha}
                    onChange={e => setNovaSenha(e.target.value)} autoComplete="new-password"
                    placeholder="Mínimo 6 caracteres" className="pr-11" />
                  <button type="button" onClick={() => setShow(s => !s)} tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="mc-conf">Confirmar nova senha</Label>
                <Input id="mc-conf" type={show ? 'text' : 'password'} value={confirmar}
                  onChange={e => setConfirmar(e.target.value)} autoComplete="new-password" placeholder="Repita a nova senha" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={salvandoSenha || !senhaAtual || !novaSenha}>
                {salvandoSenha ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {salvandoSenha ? 'Salvando...' : 'Alterar senha'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
