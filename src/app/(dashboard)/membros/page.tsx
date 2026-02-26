"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Membro, Departamento } from '@/types'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { VisitorModal } from '@/components/membros/VisitorModal'
import { MemberViewModal } from '@/components/membros/MemberViewModal'
import { MemberModal } from '@/components/membros/MemberModal'
import { Loader2, Plus, Search, Pencil, Trash2, Eye, UserPlus, Download, Phone, MapPin } from 'lucide-react'
import { calcularIdade, cn } from '@/lib/utils'
import { getCargoStyle, getDeptBadgeStyle, CARGOS_ECLESIASTICOS } from '@/lib/constants'

const TIPO_STYLE: Record<string, { card: string; avatar: string }> = {
  Membro:     { card: 'border-l-4 border-l-blue-500',    avatar: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  Congregado: { card: 'border-l-4 border-l-emerald-500', avatar: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  Visitante:  { card: 'border-l-4 border-l-amber-500',   avatar: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
}

export default function MembrosPage() {
  const { token, isAdmin } = useAuth()
  const { toast } = useToast()
  const [membros, setMembros] = useState<Membro[]>([])
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState('')
  const [filterCargo, setFilterCargo] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [visitorModal, setVisitorModal] = useState(false)
  const [viewMembro, setViewMembro] = useState<Membro | null>(null)
  const [memberModal, setMemberModal] = useState<{ open: boolean; id?: number }>({ open: false })
  const [exporting, setExporting] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  const loadMembros = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterTipo) params.set('tipo', filterTipo)
      if (filterCargo) params.set('cargo', filterCargo)
      if (filterDept) params.set('departamento', filterDept)

      const res = await fetch(`/api/membros?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setMembros(await res.json())
    } finally {
      setLoading(false)
    }
  }, [token, search, filterTipo, filterCargo, filterDept])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(loadMembros, 300)
    return () => clearTimeout(searchTimer.current)
  }, [loadMembros])

  useEffect(() => {
    if (!token) return
    fetch('/api/departamentos', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setDepartamentos)
      .catch(() => {})
  }, [token])

  const handleDelete = async (id: number, nome: string) => {
    if (!confirm(`Excluir o membro "${nome}"?\n\nEsta ação não pode ser desfeita.`)) return
    const res = await fetch(`/api/membros/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: data.error, variant: 'destructive' })
    } else {
      toast({ title: 'Membro excluído.' })
      loadMembros()
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch('/api/membros/exportar', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        toast({ title: 'Erro ao exportar planilha.', variant: 'destructive' })
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `membros_${new Date().toISOString().split('T')[0]}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Membros</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Carregando...' : `${membros.length} resultado${membros.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="hidden sm:inline">Exportar Excel</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setVisitorModal(true)}>
            <UserPlus className="h-4 w-4" />
            Visitante
          </Button>
          <Button size="sm" onClick={() => setMemberModal({ open: true })}>
            <Plus className="h-4 w-4" />
            Novo Membro
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
        <div className="relative sm:col-span-2 xl:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Buscar por nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>

        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos os tipos</option>
          <option value="Membro">Membro</option>
          <option value="Congregado">Congregado</option>
          <option value="Visitante">Visitante</option>
        </select>

        <select
          value={filterCargo}
          onChange={e => setFilterCargo(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos os cargos</option>
          {CARGOS_ECLESIASTICOS.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos os departamentos</option>
          {departamentos.map(d => (
            <option key={d.id} value={String(d.id)}>{d.nome}</option>
          ))}
        </select>
      </div>

      {/* Legenda de cores */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />Membro</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />Congregado</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />Visitante</span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : membros.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Nenhum membro encontrado.</p>
            {(search || filterTipo || filterCargo || filterDept) && (
              <p className="text-xs text-muted-foreground mt-1">Tente remover os filtros.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {membros.map(m => {
            const idade = calcularIdade(m.data_nascimento || null)
            const tipoStyle = TIPO_STYLE[m.tipo_participante] || { card: '', avatar: 'bg-primary/10 dark:bg-primary/20 text-primary' }
            return (
              <Card key={m.id} className={cn('hover:shadow-sm transition-shadow', tipoStyle.card)}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar colorido por tipo */}
                    <div className={cn(
                      'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm select-none',
                      tipoStyle.avatar
                    )}>
                      {m.nome.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <p className="font-semibold text-sm leading-tight">{m.nome}</p>
                        {m.conhecido_como && (
                          <span className="text-xs text-muted-foreground hidden sm:inline">
                            &quot;{m.conhecido_como}&quot;
                          </span>
                        )}
                      </div>

                      {m.funcao_igreja && (
                        <p className="text-xs text-muted-foreground leading-tight mt-0.5">{m.funcao_igreja}</p>
                      )}

                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.cargo && (
                          <Badge
                            className="text-xs h-5"
                            style={getCargoStyle(m.cargo)}
                          >
                            {m.cargo}
                          </Badge>
                        )}
                        {m.sexo && (
                          <Badge variant="outline" className="text-xs h-5">{m.sexo[0]}</Badge>
                        )}
                        {idade !== null && (
                          <Badge variant="outline" className="text-xs h-5">{idade}a</Badge>
                        )}
                        {m.departamentos_info?.map((d, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-xs h-5 hidden sm:inline-flex"
                            style={getDeptBadgeStyle(d.dept_id ?? d.dept_nome)}
                          >
                            {d.dept_nome}{d.cargo_departamento ? ` · ${d.cargo_departamento}` : ''}
                          </Badge>
                        ))}
                      </div>

                      {/* Contato / Localização — visível em sm+ */}
                      {(m.telefone_principal || m.cidade) && (
                        <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block truncate">
                          {m.telefone_principal && (
                            <span className="inline-flex items-center gap-1 mr-2">
                              <Phone className="h-3 w-3" />
                              {m.telefone_principal}
                            </span>
                          )}
                          {m.cidade && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {m.cidade}{m.estado ? `/${m.estado}` : ''}
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => setViewMembro(m)}
                        className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setMemberModal({ open: true, id: m.id })}
                        className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(m.id, m.nome)}
                          className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modais */}
      <VisitorModal
        open={visitorModal}
        onClose={() => setVisitorModal(false)}
        onSuccess={loadMembros}
        token={token}
      />

      <MemberViewModal
        membro={viewMembro}
        open={!!viewMembro}
        onClose={() => setViewMembro(null)}
        onEdit={id => { setViewMembro(null); setMemberModal({ open: true, id }) }}
        onVisitaRegistrada={loadMembros}
      />

      <MemberModal
        open={memberModal.open}
        membroId={memberModal.id}
        onClose={() => setMemberModal({ open: false })}
        onSuccess={loadMembros}
      />
    </div>
  )
}
