"use client"

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Usuario, PerfilAcesso, Departamento, Permissoes } from '@/types'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, Plus, Pencil, Trash2, Shield, User, UserCog, Lock, ChevronDown, ChevronUp, Check } from 'lucide-react'
import { formatarData } from '@/lib/utils'
import { PERMISSOES_DISPONIVEIS } from '@/lib/constants'

// ─── Tipos ───────────────────────────────────────────────────────────────────

const defaultUserForm = {
  nome: '', email: '', senha: '',
  tipo: 'usuario' as 'admin' | 'usuario',
  ativo: true,
  perfil_id: '' as string | number,
  departamentos_acesso: [] as number[],
}

const defaultPerfilForm = {
  nome: '',
  descricao: '',
  permissoes: {} as Permissoes,
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function UsuariosPage() {
  const { token, isAdmin } = useAuth()
  const { toast } = useToast()

  // Usuários
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [userDialog, setUserDialog] = useState(false)
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [userForm, setUserForm] = useState(defaultUserForm)
  const [savingUser, setSavingUser] = useState(false)

  // Perfis
  const [perfis, setPerfis] = useState<PerfilAcesso[]>([])
  const [loadingPerfis, setLoadingPerfis] = useState(true)
  const [perfisExpanded, setPerfisExpanded] = useState(false)
  const [perfilDialog, setPerfilDialog] = useState(false)
  const [editingPerfilId, setEditingPerfilId] = useState<number | null>(null)
  const [perfilForm, setPerfilForm] = useState(defaultPerfilForm)
  const [savingPerfil, setSavingPerfil] = useState(false)

  // Departamentos
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])

  // ─── Loaders ──────────────────────────────────────────────────────────────

  const loadUsuarios = useCallback(async () => {
    if (!token) return
    setLoadingUsers(true)
    try {
      const res = await fetch('/api/usuarios', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setUsuarios(await res.json())
    } finally {
      setLoadingUsers(false)
    }
  }, [token])

  const loadPerfis = useCallback(async () => {
    if (!token) return
    setLoadingPerfis(true)
    try {
      const res = await fetch('/api/perfis', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setPerfis(await res.json())
    } finally {
      setLoadingPerfis(false)
    }
  }, [token])

  useEffect(() => { loadUsuarios() }, [loadUsuarios])
  useEffect(() => { loadPerfis() }, [loadPerfis])

  useEffect(() => {
    if (!token) return
    fetch('/api/departamentos', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setDepartamentos)
      .catch(() => {})
  }, [token])

  // ─── Guard ────────────────────────────────────────────────────────────────

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Acesso restrito a administradores.
      </div>
    )
  }

  // ─── CRUD Usuários ────────────────────────────────────────────────────────

  const openNewUser = () => {
    setEditingUserId(null)
    setUserForm(defaultUserForm)
    setUserDialog(true)
  }

  const openEditUser = (u: Usuario) => {
    setEditingUserId(u.id)
    setUserForm({
      nome: u.nome,
      email: u.email,
      senha: '',
      tipo: u.tipo,
      ativo: u.ativo,
      perfil_id: u.perfil_id ?? '',
      departamentos_acesso: u.departamentos_acesso || [],
    })
    setUserDialog(true)
  }

  const handleSaveUser = async () => {
    if (!userForm.nome || !userForm.email) {
      toast({ title: 'Preencha nome e email.', variant: 'destructive' })
      return
    }
    if (!editingUserId && !userForm.senha) {
      toast({ title: 'Senha obrigatória para novo usuário.', variant: 'destructive' })
      return
    }

    setSavingUser(true)
    try {
      const url = editingUserId ? `/api/usuarios/${editingUserId}` : '/api/usuarios'
      const method = editingUserId ? 'PUT' : 'POST'
      const body = {
        ...userForm,
        perfil_id: userForm.perfil_id !== '' ? Number(userForm.perfil_id) : null,
        departamentos_acesso: userForm.departamentos_acesso.length > 0 ? userForm.departamentos_acesso : null,
      }
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: data.error, variant: 'destructive' })
        return
      }
      toast({ title: editingUserId ? 'Usuário atualizado!' : 'Usuário criado!' })
      setUserDialog(false)
      loadUsuarios()
    } finally {
      setSavingUser(false)
    }
  }

  const handleDeleteUser = async (id: number, nome: string) => {
    if (!confirm(`Excluir o usuário "${nome}"?`)) return
    const res = await fetch(`/api/usuarios/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: data.error, variant: 'destructive' })
    } else {
      toast({ title: 'Usuário excluído.' })
      loadUsuarios()
    }
  }

  const toggleDeptAcesso = (id: number) => {
    setUserForm(f => ({
      ...f,
      departamentos_acesso: f.departamentos_acesso.includes(id)
        ? f.departamentos_acesso.filter(x => x !== id)
        : [...f.departamentos_acesso, id],
    }))
  }

  // ─── CRUD Perfis ──────────────────────────────────────────────────────────

  const openNewPerfil = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingPerfilId(null)
    setPerfilForm(defaultPerfilForm)
    setPerfilDialog(true)
  }

  const openEditPerfil = (p: PerfilAcesso) => {
    setEditingPerfilId(p.id)
    setPerfilForm({ nome: p.nome, descricao: p.descricao || '', permissoes: { ...p.permissoes } })
    setPerfilDialog(true)
  }

  const handleSavePerfil = async () => {
    if (!perfilForm.nome.trim()) {
      toast({ title: 'Nome do perfil é obrigatório.', variant: 'destructive' })
      return
    }
    setSavingPerfil(true)
    try {
      const url = editingPerfilId ? `/api/perfis/${editingPerfilId}` : '/api/perfis'
      const method = editingPerfilId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(perfilForm),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: data.error, variant: 'destructive' })
        return
      }
      toast({ title: editingPerfilId ? 'Perfil atualizado!' : 'Perfil criado!' })
      setPerfilDialog(false)
      loadPerfis()
    } finally {
      setSavingPerfil(false)
    }
  }

  const handleDeletePerfil = async (id: number, nome: string) => {
    if (!confirm(`Excluir o perfil "${nome}"?\n\nOs usuários com este perfil perderão suas restrições.`)) return
    const res = await fetch(`/api/perfis/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: data.error, variant: 'destructive' })
    } else {
      toast({ title: 'Perfil excluído.' })
      loadPerfis()
      loadUsuarios()
    }
  }

  const togglePermissao = (key: string) => {
    setPerfilForm(f => ({
      ...f,
      permissoes: { ...f.permissoes, [key]: !f.permissoes[key] },
    }))
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <UserCog className="h-6 w-6" />
            Usuários
          </h1>
          <p className="text-muted-foreground text-sm">Gerenciar usuários e permissões</p>
        </div>
        <Button onClick={openNewUser}>
          <Plus className="h-4 w-4" />
          Novo Usuário
        </Button>
      </div>

      {/* ─── Seção: Perfis de Acesso ─────────────────────────────────────── */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setPerfisExpanded(e => !e)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">
                Perfis de Acesso
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({loadingPerfis ? '…' : perfis.length} perfil{perfis.length !== 1 ? 's' : ''})
                </span>
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={openNewPerfil}>
                <Plus className="h-3.5 w-3.5" />
                Novo Perfil
              </Button>
              {perfisExpanded
                ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
              }
            </div>
          </div>
        </CardHeader>

        {perfisExpanded && (
          <CardContent className="pt-0">
            {loadingPerfis ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : perfis.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Nenhum perfil criado. Clique em &quot;Novo Perfil&quot; para começar.
              </p>
            ) : (
              <div className="space-y-3">
                {perfis.map(p => {
                  const permsAtivas = PERMISSOES_DISPONIVEIS.filter(pd => p.permissoes[pd.key])
                  return (
                    <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{p.nome}</p>
                          {permsAtivas.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {permsAtivas.length} permissão{permsAtivas.length !== 1 ? 'ões' : ''}
                            </span>
                          )}
                        </div>
                        {p.descricao && (
                          <p className="text-xs text-muted-foreground mt-0.5">{p.descricao}</p>
                        )}
                        {permsAtivas.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {permsAtivas.map(pd => (
                              <Badge key={pd.key} variant="secondary" className="text-xs h-4 px-1.5">
                                {pd.label}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {permsAtivas.length === 0 && (
                          <p className="text-xs text-muted-foreground mt-1 italic">Sem permissões ativas</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditPerfil(p)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeletePerfil(p.id, p.nome)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* ─── Lista de Usuários ───────────────────────────────────────────── */}
      {loadingUsers ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <div className="grid gap-3">
          {usuarios.map(u => (
            <Card key={u.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                    {u.tipo === 'admin'
                      ? <Shield className="h-5 w-5 text-primary" />
                      : <User className="h-5 w-5 text-muted-foreground" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{u.nome}</p>
                      <Badge variant={u.tipo === 'admin' ? 'default' : 'secondary'}>
                        {u.tipo === 'admin' ? 'Admin' : 'Usuário'}
                      </Badge>
                      {!u.ativo && <Badge variant="destructive">Inativo</Badge>}
                      {u.perfil_nome && (
                        <Badge variant="outline" className="text-xs gap-1">
                          <Lock className="h-2.5 w-2.5" />
                          {u.perfil_nome}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{u.email}</p>
                    {u.departamentos_acesso && u.departamentos_acesso.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Acesso restrito a {u.departamentos_acesso.length} departamento{u.departamentos_acesso.length !== 1 ? 's' : ''}
                      </p>
                    )}
                    {u.ultimo_acesso && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Último acesso: {formatarData(u.ultimo_acesso)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEditUser(u)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id, u.nome)} className="text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ─── Modal: Usuário ───────────────────────────────────────────────── */}
      <Dialog open={userDialog} onOpenChange={setUserDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingUserId ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Dados básicos */}
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={userForm.nome} onChange={e => setUserForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input type="email" value={userForm.email} onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>{editingUserId ? 'Nova Senha (deixe em branco para manter)' : 'Senha *'}</Label>
              <Input type="password" value={userForm.senha} onChange={e => setUserForm(f => ({ ...f, senha: e.target.value }))} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                value={userForm.tipo}
                onChange={e => setUserForm(f => ({ ...f, tipo: e.target.value as 'admin' | 'usuario' }))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="usuario">Usuário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            {/* Perfil de Acesso (só para não-admins) */}
            {userForm.tipo !== 'admin' && (
              <>
                <div className="space-y-2">
                  <Label>Perfil de Acesso</Label>
                  <select
                    value={userForm.perfil_id}
                    onChange={e => setUserForm(f => ({ ...f, perfil_id: e.target.value }))}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Sem perfil (acesso total)</option>
                    {perfis.map(p => (
                      <option key={p.id} value={p.id}>{p.nome}</option>
                    ))}
                  </select>
                  {userForm.perfil_id === '' && (
                    <p className="text-xs text-muted-foreground">Sem perfil = acesso total ao sistema</p>
                  )}
                </div>

                {/* Restrição de departamentos */}
                {departamentos.length > 0 && (
                  <div className="space-y-2">
                    <Label>Departamentos com Acesso</Label>
                    <p className="text-xs text-muted-foreground">Deixe vazio para permitir acesso a todos os departamentos.</p>
                    <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                      {departamentos.map(d => (
                        <label key={d.id} className="flex items-center gap-2.5 cursor-pointer rounded px-1 py-1 hover:bg-accent/50 transition-colors">
                          <div
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              userForm.departamentos_acesso.includes(d.id)
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground/40'
                            }`}
                            onClick={() => toggleDeptAcesso(d.id)}
                          >
                            {userForm.departamentos_acesso.includes(d.id) && (
                              <Check className="h-2.5 w-2.5 text-primary-foreground" />
                            )}
                          </div>
                          <span className="text-sm" onClick={() => toggleDeptAcesso(d.id)}>{d.nome}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Ativo (só na edição) */}
            {editingUserId && (
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    userForm.ativo ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                  }`}
                  onClick={() => setUserForm(f => ({ ...f, ativo: !f.ativo }))}
                >
                  {userForm.ativo && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </div>
                <span className="text-sm" onClick={() => setUserForm(f => ({ ...f, ativo: !f.ativo }))}>Usuário ativo</span>
              </label>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUserDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveUser} disabled={savingUser}>
              {savingUser && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingUserId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Modal: Perfil de Acesso ──────────────────────────────────────── */}
      <Dialog open={perfilDialog} onOpenChange={setPerfilDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPerfilId ? 'Editar Perfil' : 'Novo Perfil de Acesso'}</DialogTitle>
            <DialogDescription>
              Defina quais seções e ações os usuários com este perfil poderão acessar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Perfil *</Label>
              <Input
                value={perfilForm.nome}
                onChange={e => setPerfilForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Ex.: Secretário, Líder de Departamento..."
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={perfilForm.descricao}
                onChange={e => setPerfilForm(f => ({ ...f, descricao: e.target.value }))}
                placeholder="Descrição opcional do perfil"
              />
            </div>

            <div className="space-y-2">
              <Label>Permissões</Label>
              <div className="border rounded-md divide-y">
                {PERMISSOES_DISPONIVEIS.map(pd => {
                  const ativo = !!perfilForm.permissoes[pd.key]
                  return (
                    <label
                      key={pd.key}
                      className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-accent/40 transition-colors"
                    >
                      <div
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          ativo ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                        }`}
                        onClick={() => togglePermissao(pd.key)}
                      >
                        {ativo && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0" onClick={() => togglePermissao(pd.key)}>
                        <p className="text-sm font-medium leading-tight">{pd.label}</p>
                        <p className="text-xs text-muted-foreground">{pd.descricao}</p>
                      </div>
                    </label>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Administradores têm acesso total independente do perfil.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPerfilDialog(false)}>Cancelar</Button>
            <Button onClick={handleSavePerfil} disabled={savingPerfil}>
              {savingPerfil && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingPerfilId ? 'Salvar' : 'Criar Perfil'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
