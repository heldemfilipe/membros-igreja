"use client"

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Departamento, MembroDepartamento, Membro } from '@/types'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, Plus, Pencil, Trash2, Building2, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { getDeptColor, getDeptBadgeStyle, getCargoStyle, CARGOS_DEPARTAMENTO } from '@/lib/constants'

export default function DepartamentosPage() {
  const { token, isAdmin } = useAuth()
  const { toast } = useToast()
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [membrosDepto, setMembrosDepto] = useState<Record<number, MembroDepartamento[]>>({})
  const [loadingMembros, setLoadingMembros] = useState<number | null>(null)

  // Modal departamento
  const [deptModal, setDeptModal] = useState(false)
  const [editingDeptId, setEditingDeptId] = useState<number | null>(null)
  const [deptForm, setDeptForm] = useState({ nome: '', descricao: '' })
  const [savingDept, setSavingDept] = useState(false)

  // Modal adicionar membro
  const [addMembroModal, setAddMembroModal] = useState<number | null>(null)
  const [todosMembros, setTodosMembros] = useState<Membro[]>([])
  const [addForm, setAddForm] = useState({ membro_id: '', cargo_departamento: '' })
  const [savingMembro, setSavingMembro] = useState(false)

  // Modal editar cargo no departamento
  const [editCargoModal, setEditCargoModal] = useState<{
    deptId: number
    membroId: number
    nome: string
    cargo: string
  } | null>(null)
  const [savingEditCargo, setSavingEditCargo] = useState(false)

  const loadDepartamentos = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/departamentos', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setDepartamentos(await res.json())
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadDepartamentos() }, [loadDepartamentos])

  const toggleExpand = async (id: number) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    if (membrosDepto[id]) return
    setLoadingMembros(id)
    try {
      const res = await fetch(`/api/departamentos/${id}/membros`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setMembrosDepto(prev => ({ ...prev, [id]: data }))
      }
    } finally {
      setLoadingMembros(null)
    }
  }

  const openNewDept = () => {
    setEditingDeptId(null)
    setDeptForm({ nome: '', descricao: '' })
    setDeptModal(true)
  }

  const openEditDept = (d: Departamento) => {
    setEditingDeptId(d.id)
    setDeptForm({ nome: d.nome, descricao: d.descricao || '' })
    setDeptModal(true)
  }

  const saveDept = async () => {
    if (!deptForm.nome.trim()) { toast({ title: 'Nome obrigatório.', variant: 'destructive' }); return }
    setSavingDept(true)
    try {
      const url = editingDeptId ? `/api/departamentos/${editingDeptId}` : '/api/departamentos'
      const method = editingDeptId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(deptForm),
      })
      const data = await res.json()
      if (!res.ok) { toast({ title: data.error, variant: 'destructive' }); return }
      toast({ title: editingDeptId ? 'Departamento atualizado!' : 'Departamento criado!' })
      setDeptModal(false)
      loadDepartamentos()
    } finally { setSavingDept(false) }
  }

  const deleteDept = async (id: number, nome: string) => {
    if (!confirm(`Excluir o departamento "${nome}"?`)) return
    const res = await fetch(`/api/departamentos/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) { toast({ title: data.error, variant: 'destructive' }) }
    else { toast({ title: 'Departamento excluído.' }); loadDepartamentos() }
  }

  const openAddMembro = async (deptId: number) => {
    setAddForm({ membro_id: '', cargo_departamento: '' })
    setAddMembroModal(deptId)
    if (todosMembros.length === 0) {
      const res = await fetch('/api/membros', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setTodosMembros(await res.json())
    }
  }

  const saveMembro = async () => {
    if (!addForm.membro_id) { toast({ title: 'Selecione um membro.', variant: 'destructive' }); return }
    setSavingMembro(true)
    try {
      const res = await fetch(`/api/departamentos/${addMembroModal}/membros`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const data = await res.json()
      if (!res.ok) { toast({ title: data.error, variant: 'destructive' }); return }
      toast({ title: 'Membro adicionado!' })
      setAddMembroModal(null)
      setMembrosDepto(prev => {
        const copy = { ...prev }
        delete copy[addMembroModal!]
        return copy
      })
      if (expandedId === addMembroModal) {
        const res2 = await fetch(`/api/departamentos/${addMembroModal}/membros`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res2.ok) {
          const membrosData = await res2.json()
          setMembrosDepto(prev => ({ ...prev, [addMembroModal!]: membrosData }))
        }
      }
      loadDepartamentos()
    } finally { setSavingMembro(false) }
  }

  const removeMembro = async (deptId: number, membroId: number, nome: string) => {
    if (!confirm(`Remover "${nome}" do departamento?`)) return
    const res = await fetch(`/api/departamentos/${deptId}/membros/${membroId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.ok) {
      toast({ title: 'Membro removido.' })
      setMembrosDepto(prev => ({
        ...prev,
        [deptId]: (prev[deptId] || []).filter(m => m.id !== membroId),
      }))
      loadDepartamentos()
    }
  }

  const saveEditCargo = async () => {
    if (!editCargoModal) return
    setSavingEditCargo(true)
    try {
      const res = await fetch(`/api/departamentos/${editCargoModal.deptId}/membros`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ membro_id: editCargoModal.membroId, cargo_departamento: editCargoModal.cargo }),
      })
      const data = await res.json()
      if (!res.ok) { toast({ title: data.error, variant: 'destructive' }); return }
      toast({ title: 'Cargo atualizado!' })
      // Atualiza localmente sem recarregar tudo
      setMembrosDepto(prev => ({
        ...prev,
        [editCargoModal.deptId]: (prev[editCargoModal.deptId] || []).map(m =>
          m.id === editCargoModal.membroId
            ? { ...m, cargo_departamento: editCargoModal.cargo || undefined }
            : m
        ),
      }))
      setEditCargoModal(null)
    } finally {
      setSavingEditCargo(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-6 w-6" />
            Departamentos
          </h1>
          <p className="text-muted-foreground text-sm">{departamentos.length} departamento{departamentos.length !== 1 ? 's' : ''}</p>
        </div>
        {isAdmin && (
          <Button onClick={openNewDept}>
            <Plus className="h-4 w-4" />
            Novo Departamento
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : departamentos.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum departamento cadastrado.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {departamentos.map(d => {
            const deptColor = getDeptColor(d.id)
            return (
              <Card key={d.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Header do departamento */}
                  <div
                    className="flex items-center gap-4 p-4 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => toggleExpand(d.id)}
                  >
                    {/* Ícone com cor do departamento */}
                    <div
                      className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: deptColor + '22', borderLeft: `3px solid ${deptColor}` }}
                    >
                      <Building2 className="h-5 w-5" style={{ color: deptColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold">{d.nome}</p>
                      {d.descricao && <p className="text-sm text-muted-foreground">{d.descricao}</p>}
                      <div className="flex items-center gap-1 mt-0.5">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{d.total_membros} membro{Number(d.total_membros) !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <>
                          <Button variant="ghost" size="icon" className="h-8 w-8"
                            onClick={e => { e.stopPropagation(); openEditDept(d) }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={e => { e.stopPropagation(); deleteDept(d.id, d.nome) }}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {expandedId === d.id ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </div>

                  {/* Lista de membros */}
                  {expandedId === d.id && (
                    <div className="border-t px-4 pb-4">
                      {isAdmin && (
                        <div className="pt-3 pb-2">
                          <Button variant="outline" size="sm" onClick={() => openAddMembro(d.id)}>
                            <Plus className="h-3 w-3" />
                            Adicionar membro
                          </Button>
                        </div>
                      )}

                      {loadingMembros === d.id ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        </div>
                      ) : (membrosDepto[d.id] || []).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-3">Nenhum membro neste departamento.</p>
                      ) : (
                        <div className="space-y-1.5 pt-2">
                          {(membrosDepto[d.id] || []).map(m => (
                            <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/30">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold select-none"
                                style={{ backgroundColor: deptColor + '22', color: deptColor }}
                              >
                                {m.nome.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{m.nome}</p>
                                <div className="flex gap-1 flex-wrap mt-0.5">
                                  {m.cargo_departamento && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs h-4"
                                      style={getDeptBadgeStyle(d.id)}
                                    >
                                      {m.cargo_departamento}
                                    </Badge>
                                  )}
                                  {m.cargo && (
                                    <Badge className="text-xs h-4" style={getCargoStyle(m.cargo)}>
                                      {m.cargo}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              {isAdmin && (
                                <div className="flex items-center gap-0.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    title="Editar cargo no departamento"
                                    onClick={() => setEditCargoModal({
                                      deptId: d.id,
                                      membroId: m.id,
                                      nome: m.nome,
                                      cargo: m.cargo_departamento || '',
                                    })}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    title="Remover do departamento"
                                    onClick={() => removeMembro(d.id, m.id, m.nome)}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          ))}
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

      {/* Modal Departamento */}
      <Dialog open={deptModal} onOpenChange={setDeptModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDeptId ? 'Editar Departamento' : 'Novo Departamento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={deptForm.nome} onChange={e => setDeptForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do departamento" />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={deptForm.descricao} onChange={e => setDeptForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição (opcional)" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeptModal(false)}>Cancelar</Button>
            <Button onClick={saveDept} disabled={savingDept}>
              {savingDept && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingDeptId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar Membro */}
      <Dialog open={!!addMembroModal} onOpenChange={() => setAddMembroModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Membro ao Departamento</DialogTitle>
            <DialogDescription>Selecione o membro e defina o cargo no departamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Membro *</Label>
              <select
                value={addForm.membro_id}
                onChange={e => setAddForm(f => ({ ...f, membro_id: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione um membro...</option>
                {todosMembros.map(m => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Cargo no Departamento (opcional)</Label>
              <select
                value={addForm.cargo_departamento}
                onChange={e => setAddForm(f => ({ ...f, cargo_departamento: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Sem cargo específico</option>
                {CARGOS_DEPARTAMENTO.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMembroModal(null)}>Cancelar</Button>
            <Button onClick={saveMembro} disabled={savingMembro}>
              {savingMembro && <Loader2 className="h-4 w-4 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Cargo no Departamento */}
      <Dialog open={!!editCargoModal} onOpenChange={() => setEditCargoModal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Cargo no Departamento</DialogTitle>
            <DialogDescription>{editCargoModal?.nome}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Cargo no Departamento</Label>
            <select
              value={editCargoModal?.cargo ?? ''}
              onChange={e => setEditCargoModal(prev => prev ? { ...prev, cargo: e.target.value } : null)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Sem cargo específico</option>
              {CARGOS_DEPARTAMENTO.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCargoModal(null)}>Cancelar</Button>
            <Button onClick={saveEditCargo} disabled={savingEditCargo}>
              {savingEditCargo && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
