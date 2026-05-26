"use client"

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AniversarianteItem, AniversarianteCasamento, Departamento } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Phone, Church, CalendarDays, Download, ChevronDown, ChevronUp } from 'lucide-react'
import { idadeFara, getDiaDoMes, cn } from '@/lib/utils'
import { getCargoStyle, getBoda, TIPO_STYLE, TIPO_STYLE_CASAMENTO } from '@/lib/constants'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function anosDeCasamento(data_casamento: string): number {
  const parts = data_casamento.split('T')[0].split('-').map(Number)
  return new Date().getFullYear() - parts[0]
}

// ─── Card de aniversariante de nascimento ─────────────────────────────────────
function CardNascimento({ a, filtroCongregacao }: { a: AniversarianteItem; filtroCongregacao: number | null }) {
  const dia = getDiaDoMes(a.data_nascimento)
  const idadeQ = idadeFara(a.data_nascimento)
  const tipoStyle = TIPO_STYLE[a.tipo_participante] || { card: '', avatar: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' }

  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 bg-card rounded-xl border hover:shadow-sm transition-shadow', tipoStyle.card)}>
      <div className={cn('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg select-none', tipoStyle.avatar)}>
        🎂
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight truncate">{a.nome}</p>
        {a.conhecido_como && (
          <p className="text-xs text-muted-foreground truncate">&quot;{a.conhecido_como}&quot;</p>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge variant="outline" className="text-xs font-medium">
            Dia {dia}{idadeQ !== null ? ` · Fará ${idadeQ} anos` : ''}
          </Badge>
          {a.cargo && (
            <Badge className="text-xs" style={getCargoStyle(a.cargo)}>{a.cargo}</Badge>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right space-y-0.5">
        {a.telefone_principal && (
          <a
            href={`https://wa.me/55${a.telefone_principal.replace(/\D/g, '')}?text=${encodeURIComponent(`Parabéns pelo seu aniversário! 🎂`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-end gap-1 text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
            title="Parabenizar no WhatsApp"
          >
            <Phone className="h-3 w-3" />
            <span className="hidden sm:inline">{a.telefone_principal}</span>
          </a>
        )}
        {!filtroCongregacao && a.igreja && (
          <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            <Church className="h-3 w-3 shrink-0" />
            <span className="hidden sm:inline truncate max-w-[100px]">{a.igreja}</span>
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Card de aniversário de casamento ─────────────────────────────────────────
function CardCasamento({
  a,
  filtroCongregacao,
  onBoda,
}: {
  a: AniversarianteCasamento
  filtroCongregacao: number | null
  onBoda: (b: { nome: string; significado: string; anos: number }) => void
}) {
  const dia = getDiaDoMes(a.data_casamento)
  const anos = anosDeCasamento(a.data_casamento)
  const boda = getBoda(anos)
  const tipoStyle = TIPO_STYLE_CASAMENTO[a.tipo_participante] || TIPO_STYLE_CASAMENTO._default

  return (
    <div className={cn('flex items-center gap-3 px-4 py-3 bg-card rounded-xl border hover:shadow-sm transition-shadow', tipoStyle.card)}>
      <div className={cn('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg select-none', tipoStyle.avatar)}>
        💍
      </div>
      <div className="flex-1 min-w-0">
        {a.conjuge_nome ? (
          <div className="leading-tight">
            <p className="font-semibold text-sm truncate">{a.nome}</p>
            <p className="text-xs text-muted-foreground truncate">+ {a.conjuge_nome}</p>
          </div>
        ) : (
          <p className="font-semibold text-sm leading-tight truncate">{a.nome}</p>
        )}
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge variant="outline" className="text-xs font-medium">
            Dia {dia} · {anos} {anos === 1 ? 'ano' : 'anos'}
          </Badge>
          {boda && (
            <Badge
              variant="outline"
              onClick={() => onBoda({ ...boda, anos })}
              className="text-xs font-medium cursor-pointer border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
            >
              💍 {boda.nome}
            </Badge>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right space-y-0.5">
        {a.telefone_principal && (
          <a
            href={`https://wa.me/55${a.telefone_principal.replace(/\D/g, '')}?text=${encodeURIComponent(`Parabéns pelo aniversário de casamento! 💍`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-end gap-1 text-xs text-emerald-600 hover:text-emerald-700 transition-colors"
            title="Parabenizar no WhatsApp"
          >
            <Phone className="h-3 w-3" />
            <span className="hidden sm:inline">{a.telefone_principal}</span>
          </a>
        )}
        {!filtroCongregacao && a.igreja && (
          <p className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
            <Church className="h-3 w-3 shrink-0" />
            <span className="hidden sm:inline truncate max-w-[100px]">{a.igreja}</span>
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Painel de exportação ICS ─────────────────────────────────────────────────
type ExportTipo = 'ambos' | 'nascimento' | 'casamento'

function ExportPanel({
  token,
  filtroCongregacao,
}: {
  token: string | null
  filtroCongregacao: number | null
}) {
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState<ExportTipo>('ambos')
  const [departamento, setDepartamento] = useState('')
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [loadingDepts, setLoadingDepts] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const loadDepts = useCallback(async () => {
    if (!token || departamentos.length > 0) return
    setLoadingDepts(true)
    try {
      const params = new URLSearchParams()
      if (filtroCongregacao) params.set('congregacao', String(filtroCongregacao))
      const res = await fetch(`/api/departamentos?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setDepartamentos(await res.json())
    } finally {
      setLoadingDepts(false)
    }
  }, [token, filtroCongregacao, departamentos.length])

  const handleToggle = () => {
    if (!open) loadDepts()
    setOpen(v => !v)
  }

  const handleDownload = async () => {
    if (!token) return
    setDownloading(true)
    try {
      const params = new URLSearchParams({ tipo })
      if (filtroCongregacao) params.set('congregacao', String(filtroCongregacao))
      if (departamento) params.set('departamento', departamento)

      const res = await fetch(`/api/aniversariantes/exportar-ics?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `aniversariantes_${tipo}.ics`
      a.click()
      URL.revokeObjectURL(url)
      setOpen(false)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        onClick={handleToggle}
        className="gap-1.5 shrink-0"
      >
        <CalendarDays className="h-3.5 w-3.5" />
        Exportar para Agenda
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </Button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-20 w-72 bg-popover border border-border rounded-xl shadow-lg p-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tipo</p>
            <div className="flex gap-1">
              {(['ambos', 'nascimento', 'casamento'] as ExportTipo[]).map(t => (
                <button
                  key={t}
                  onClick={() => setTipo(t)}
                  className={cn(
                    'flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors border',
                    tipo === t
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-muted-foreground border-border hover:bg-accent'
                  )}
                >
                  {t === 'ambos' ? 'Ambos' : t === 'nascimento' ? '🎂 Nasc.' : '💍 Casam.'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Departamento</p>
            {loadingDepts ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Carregando...
              </div>
            ) : (
              <select
                value={departamento}
                onChange={e => setDepartamento(e.target.value)}
                className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Toda a congregação</option>
                {departamentos.map(d => (
                  <option key={d.id} value={String(d.id)}>
                    {d.nome}{d.congregacao_nome ? ` (${d.congregacao_nome})` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="pt-1 border-t border-border">
            <p className="text-[10px] text-muted-foreground mb-2">
              Gera um arquivo <strong>.ics</strong> com eventos anuais recorrentes.
              Re-importar atualiza os eventos existentes sem duplicar.
            </p>
            <Button
              size="sm"
              onClick={handleDownload}
              disabled={downloading}
              className="w-full gap-1.5"
            >
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {downloading ? 'Gerando...' : 'Baixar .ics'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function AniversariantesPage() {
  const searchParams = useSearchParams()
  const { token, filtroCongregacao } = useAuth()
  const [aba, setAba] = useState<'nascimento' | 'casamento'>(
    searchParams.get('aba') === 'casamento' ? 'casamento' : 'nascimento'
  )
  const [mes, setMes] = useState(new Date().getMonth() + 1)

  const [aniversariantes, setAniversariantes] = useState<AniversarianteItem[]>([])
  const [loadingNasc, setLoadingNasc] = useState(false)

  const [anivCasamento, setAnivCasamento] = useState<AniversarianteCasamento[]>([])
  const [loadingCas, setLoadingCas] = useState(false)

  const [bodaDialog, setBodaDialog] = useState<{ nome: string; significado: string; anos: number } | null>(null)

  const loadNascimento = useCallback(async () => {
    if (!token) return
    setLoadingNasc(true)
    try {
      const params = new URLSearchParams({ mes: String(mes) })
      if (filtroCongregacao) params.set('congregacao', String(filtroCongregacao))
      const res = await fetch(`/api/aniversariantes?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setAniversariantes(await res.json())
    } finally {
      setLoadingNasc(false)
    }
  }, [token, mes, filtroCongregacao])

  const loadCasamento = useCallback(async () => {
    if (!token) return
    setLoadingCas(true)
    try {
      const params = new URLSearchParams({ mes: String(mes) })
      if (filtroCongregacao) params.set('congregacao', String(filtroCongregacao))
      const res = await fetch(`/api/aniversariantes/casamento?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setAnivCasamento(await res.json())
    } finally {
      setLoadingCas(false)
    }
  }, [token, mes, filtroCongregacao])

  useEffect(() => { loadNascimento() }, [loadNascimento])
  useEffect(() => { if (aba === 'casamento') loadCasamento() }, [aba, loadCasamento])

  const loading = aba === 'nascimento' ? loadingNasc : loadingCas
  const total = aba === 'nascimento' ? aniversariantes.length : anivCasamento.length
  const totalLabel = aba === 'nascimento'
    ? `${total} aniversariante${total !== 1 ? 's' : ''} em ${MESES[mes - 1]}`
    : `${total} aniversário${total !== 1 ? 's' : ''} de casamento em ${MESES[mes - 1]}`

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-0.5">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {aba === 'nascimento' ? '🎂' : '💍'}
            Aniversariantes
          </h1>
          <ExportPanel token={token} filtroCongregacao={filtroCongregacao} />
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {loading ? '...' : totalLabel}
        </p>

        {/* Tabs + Mês */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
            <button
              onClick={() => setAba('nascimento')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors',
                aba === 'nascimento'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              🎂 Nascimento
            </button>
            <button
              onClick={() => setAba('casamento')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-l border-border',
                aba === 'casamento'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              💍 Casamento
            </button>
          </div>

          <select
            value={mes}
            onChange={e => setMes(Number(e.target.value))}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring flex-1 min-w-[110px]"
          >
            {MESES.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : aba === 'nascimento' ? (
        aniversariantes.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            Nenhum aniversariante em {MESES[mes - 1]}.
          </p>
        ) : (
          <div className="space-y-2">
            {aniversariantes.map(a => (
              <CardNascimento key={a.id} a={a} filtroCongregacao={filtroCongregacao} />
            ))}
          </div>
        )
      ) : (
        anivCasamento.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">
            Nenhum aniversário de casamento em {MESES[mes - 1]}.
          </p>
        ) : (
          <div className="space-y-2">
            {anivCasamento.map(a => (
              <CardCasamento
                key={a.id}
                a={a}
                filtroCongregacao={filtroCongregacao}
                onBoda={setBodaDialog}
              />
            ))}
          </div>
        )
      )}

      {/* Dialog de Boda */}
      {bodaDialog && (
        <Dialog open onOpenChange={() => setBodaDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader className="sr-only">
              <DialogTitle>{bodaDialog.nome}</DialogTitle>
            </DialogHeader>
            <div className="text-center space-y-3 py-2">
              <div className="text-5xl">💍</div>
              <h2 className="text-xl font-bold">{bodaDialog.nome}</h2>
              <p className="text-sm text-muted-foreground font-medium">
                {bodaDialog.anos} {bodaDialog.anos === 1 ? 'ano' : 'anos'} de casamento
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">{bodaDialog.significado}</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
