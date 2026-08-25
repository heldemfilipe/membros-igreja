"use client"

import { useEffect, useRef, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, Download, Church, Building2, Users, UserSearch, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Departamento } from '@/types'

type Escopo = 'todos' | 'congregacao' | 'departamento' | 'pessoas'

interface PessoaResultado {
  id: number
  nome: string
  conhecido_como?: string
  igreja?: string
  tipo_participante: string
}

interface Props {
  open: boolean
  onClose: () => void
  token: string | null
  congregacoes: { id: number; nome: string }[]
  departamentos: Departamento[]
}

const ESCOPOS: { value: Escopo; label: string; icon: typeof Church }[] = [
  { value: 'todos', label: 'Toda a igreja', icon: Church },
  { value: 'congregacao', label: 'Uma congregação', icon: Building2 },
  { value: 'departamento', label: 'Um departamento', icon: Users },
  { value: 'pessoas', label: 'Pessoas específicas', icon: UserSearch },
]

export function ExportModal({ open, onClose, token, congregacoes, departamentos }: Props) {
  const { toast } = useToast()
  const [escopo, setEscopo] = useState<Escopo>('todos')
  const [congregacaoId, setCongregacaoId] = useState('')
  const [departamentoId, setDepartamentoId] = useState('')
  const [busca, setBusca] = useState('')
  const [resultados, setResultados] = useState<PessoaResultado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [selecionados, setSelecionados] = useState<PessoaResultado[]>([])
  const [exporting, setExporting] = useState(false)
  const buscaTimer = useRef<ReturnType<typeof setTimeout>>()

  const reset = () => {
    setEscopo('todos')
    setCongregacaoId('')
    setDepartamentoId('')
    setBusca('')
    setResultados([])
    setSelecionados([])
  }

  const handleClose = () => {
    if (exporting) return
    reset()
    onClose()
  }

  // Busca de pessoas com debounce
  useEffect(() => {
    if (escopo !== 'pessoas' || !token) return
    clearTimeout(buscaTimer.current)
    if (!busca.trim()) {
      setResultados([])
      return
    }
    buscaTimer.current = setTimeout(async () => {
      setBuscando(true)
      try {
        const params = new URLSearchParams({ search: busca, ativo: 'todos' })
        const res = await fetch(`/api/membros?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) {
          const data: PessoaResultado[] = await res.json()
          setResultados(data.slice(0, 30))
        }
      } finally {
        setBuscando(false)
      }
    }, 300)
    return () => clearTimeout(buscaTimer.current)
  }, [busca, escopo, token])

  const toggleSelecionado = (p: PessoaResultado) => {
    setSelecionados(prev =>
      prev.some(s => s.id === p.id) ? prev.filter(s => s.id !== p.id) : [...prev, p],
    )
  }

  const removerSelecionado = (id: number) => {
    setSelecionados(prev => prev.filter(s => s.id !== id))
  }

  const podeExportar =
    escopo === 'todos' ||
    (escopo === 'congregacao' && !!congregacaoId) ||
    (escopo === 'departamento' && !!departamentoId) ||
    (escopo === 'pessoas' && selecionados.length > 0)

  const handleExport = async () => {
    if (!podeExportar) return
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (escopo === 'congregacao') params.set('congregacao', congregacaoId)
      if (escopo === 'departamento') params.set('departamento', departamentoId)
      if (escopo === 'pessoas') params.set('membros', selecionados.map(s => s.id).join(','))

      const res = await fetch(`/api/membros/exportar?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        toast({ title: 'Erro ao exportar planilha.', variant: 'destructive' })
        return
      }
      const contentType = res.headers.get('Content-Type') || ''
      if (contentType.includes('application/json')) {
        const data = await res.json()
        toast({ title: data.error || 'Nenhum membro encontrado para o escopo selecionado.', variant: 'destructive' })
        return
      }

      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match?.[1] || `membros_${new Date().toISOString().split('T')[0]}.xlsx`

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)

      toast({ title: '✓ Planilha exportada!' })
      handleClose()
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Exportar Excel</DialogTitle>
          <DialogDescription>
            Escolha o que deseja incluir na planilha.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Seletor de escopo */}
          <div className="grid grid-cols-2 gap-2">
            {ESCOPOS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setEscopo(value)}
                className={cn(
                  'flex items-center gap-2 h-10 px-3 rounded-md border text-sm font-medium transition-colors text-left',
                  escopo === value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-input hover:bg-accent text-muted-foreground',
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            ))}
          </div>

          {/* Opções dependentes do escopo */}
          {escopo === 'congregacao' && (
            <select
              value={congregacaoId}
              onChange={e => setCongregacaoId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            >
              <option value="">Selecione a congregação...</option>
              {congregacoes.map(c => (
                <option key={c.id} value={String(c.id)}>{c.nome}</option>
              ))}
            </select>
          )}

          {escopo === 'departamento' && (
            <select
              value={departamentoId}
              onChange={e => setDepartamentoId(e.target.value)}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            >
              <option value="">Selecione o departamento...</option>
              {departamentos.map(d => (
                <option key={d.id} value={String(d.id)}>
                  {d.nome}{d.congregacao_nome ? ` — ${d.congregacao_nome}` : ''}
                </option>
              ))}
            </select>
          )}

          {escopo === 'pessoas' && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar por nome..."
                  className="pl-9"
                  autoFocus
                />
              </div>

              {/* Selecionados */}
              {selecionados.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selecionados.map(s => (
                    <Badge key={s.id} variant="secondary" className="gap-1 pr-1">
                      {s.nome}
                      <button
                        type="button"
                        onClick={() => removerSelecionado(s.id)}
                        className="rounded-full hover:bg-muted-foreground/20 p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              {/* Resultados da busca */}
              {busca.trim() && (
                <div className="border rounded-md max-h-48 overflow-y-auto divide-y">
                  {buscando ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : resultados.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">Nenhum membro encontrado.</p>
                  ) : (
                    resultados.map(p => {
                      const marcado = selecionados.some(s => s.id === p.id)
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => toggleSelecionado(p)}
                          className={cn(
                            'w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors',
                            marcado && 'bg-primary/5',
                          )}
                        >
                          <span className="truncate">
                            {p.nome}
                            {p.conhecido_como && <span className="text-muted-foreground"> &quot;{p.conhecido_como}&quot;</span>}
                          </span>
                          {marcado && <span className="text-primary text-xs font-medium shrink-0">Selecionado</span>}
                        </button>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={exporting}>
            Cancelar
          </Button>
          <Button onClick={handleExport} disabled={!podeExportar || exporting}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Exportar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
