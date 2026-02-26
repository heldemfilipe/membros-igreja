"use client"

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Loader2, Plus, Pencil, Trash2, Church, Users, ChevronDown, ChevronUp, MapPin } from 'lucide-react'
import { calcularIdade } from '@/lib/utils'
import { getCargoStyle } from '@/lib/constants'

type Congregacao = {
  id: number
  nome: string
  cidade?: string
  estado?: string
  observacoes?: string
  total_membros: number
}

type MembroCong = {
  id: number
  nome: string
  cargo?: string
  sexo?: string
  tipo_participante: string
  telefone_principal?: string
  data_nascimento?: string
}

const TIPO_STYLE: Record<string, { card: string; avatar: string }> = {
  Membro:     { card: 'border-l-4 border-l-blue-500',    avatar: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  Congregado: { card: 'border-l-4 border-l-emerald-500', avatar: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  Visitante:  { card: 'border-l-4 border-l-amber-500',   avatar: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
}

export default function CongregacoesPage() {
  const { token, isAdmin } = useAuth()
  const { toast } = useToast()
  const [congregacoes, setCongregacoes] = useState<Congregacao[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [membrosCong, setMembrosCong] = useState<Record<number, MembroCong[]>>({})
  const [loadingMembros, setLoadingMembros] = useState<number | null>(null)

  // Modal CRUD
  const [modal, setModal] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState({ nome: '', cidade: '', estado: '', observacoes: '' })
  const [saving, setSaving] = useState(false)

  const loadCongregacoes = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/congregacoes', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setCongregacoes(await res.json())
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadCongregacoes() }, [loadCongregacoes])

  const toggleExpand = async (id: number) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (membrosCong[id]) return
    setLoadingMembros(id)
    try {
      const res = await fetch(`/api/congregacoes/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const data = await res.json()
        setMembrosCong(prev => ({ ...prev, [id]: data }))
      }
    } finally {
      setLoadingMembros(null)
    }
  }

  const openNew = () => {
    setEditingId(null)
    setForm({ nome: '', cidade: '', estado: '', observacoes: '' })
    setModal(true)
  }

  const openEdit = (c: Congregacao) => {
    setEditingId(c.id)
    setForm({ nome: c.nome, cidade: c.cidade || '', estado: c.estado || '', observacoes: c.observacoes || '' })
    setModal(true)
  }

  const save = async () => {
    if (!form.nome.trim()) { toast({ title: 'Nome obrigatório.', variant: 'destructive' }); return }
    setSaving(true)
    try {
      const url = editingId ? `/api/congregacoes/${editingId}` : '/api/congregacoes'
      const method = editingId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { toast({ title: data.error, variant: 'destructive' }); return }
      toast({ title: editingId ? 'Congregação atualizada!' : 'Congregação criada!' })
      setModal(false)
      // Limpa cache de membros se renomeou
      if (editingId) setMembrosCong(prev => { const c = { ...prev }; delete c[editingId]; return c })
      loadCongregacoes()
    } finally { setSaving(false) }
  }

  const deleteCong = async (id: number, nome: string) => {
    if (!confirm(`Excluir a congregação "${nome}"?\nOs membros vinculados perderão essa associação.`)) return
    const res = await fetch(`/api/congregacoes/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) { toast({ title: data.error, variant: 'destructive' }) }
    else { toast({ title: 'Congregação excluída.' }); loadCongregacoes() }
  }

  // Paleta de cores para congregações
  const CORES = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
    '#3b82f6', '#ef4444', '#14b8a6', '#f97316', '#84cc16',
  ]
  const getCor = (id: number) => CORES[(id - 1) % CORES.length]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Church className="h-6 w-6" />
            Congregações
          </h1>
          <p className="text-muted-foreground text-sm">
            {congregacoes.length} congregação{congregacoes.length !== 1 ? 'ões' : ''}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" />
            Nova Congregação
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : congregacoes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma congregação cadastrada.
            {isAdmin && (
              <p className="text-sm mt-2">
                <button className="text-primary hover:underline" onClick={openNew}>
                  Cadastrar primeira congregação
                </button>
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {congregacoes.map(c => {
            const cor = getCor(c.id)
            return (
              <Card key={c.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Header */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => toggleExpand(c.id)}
                  >
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: cor + '22', borderLeft: `3px solid ${cor}` }}
                    >
                      <Church className="h-5 w-5" style={{ color: cor }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{c.nome}</p>
                      {(c.cidade || c.estado) && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[c.cidade, c.estado].filter(Boolean).join(', ')}
                        </p>
                      )}
                      <div className="flex items-center gap-1 mt-0.5">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {c.total_membros} membro{c.total_membros !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={e => { e.stopPropagation(); openEdit(c) }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={e => { e.stopPropagation(); deleteCong(c.id, c.nome) }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {expandedId === c.id
                        ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      }
                    </div>
                  </div>

                  {/* Lista de membros */}
                  {expandedId === c.id && (
                    <div className="border-t px-4 pb-4">
                      {loadingMembros === c.id ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      ) : (membrosCong[c.id] || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-3">Nenhum membro nesta congregação.</p>
                      ) : (
                        <div className="space-y-1.5 pt-3">
                          {(membrosCong[c.id] || []).map(m => {
                            const tipoStyle = TIPO_STYLE[m.tipo_participante] || { card: '', avatar: 'bg-primary/10 text-primary' }
                            const idade = calcularIdade(m.data_nascimento || null)
                            return (
                              <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold select-none ${tipoStyle.avatar}`}>
                                  {m.nome.slice(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-baseline gap-1.5">
                                    <p className="text-sm font-medium">{m.nome}</p>
                                    {idade !== null && (
                                      <span className="text-xs font-medium" style={{ color: cor }}>· {idade}a</span>
                                    )}
                                  </div>
                                  <div className="flex gap-1 flex-wrap mt-0.5">
                                    {m.cargo && (
                                      <Badge className="text-xs h-4" style={getCargoStyle(m.cargo)}>
                                        {m.cargo}
                                      </Badge>
                                    )}
                                    {m.sexo && (
                                      <Badge variant="outline" className="text-xs h-4">{m.sexo[0]}</Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal CRUD */}
      <Dialog open={modal} onOpenChange={setModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Congregação' : 'Nova Congregação'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={form.nome}
                onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                placeholder="Nome da congregação"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={form.cidade}
                  onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
                  placeholder="Cidade"
                />
              </div>
              <div className="space-y-2">
                <Label>Estado (UF)</Label>
                <Input
                  value={form.estado}
                  onChange={e => setForm(f => ({ ...f, estado: e.target.value.toUpperCase().slice(0, 2) }))}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Input
                value={form.observacoes}
                onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                placeholder="Observações (opcional)"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
