"use client"

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AniversarianteItem, AniversarianteCasamento } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2, Phone, Church } from 'lucide-react'
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
          <a href={`tel:${a.telefone_principal}`} className="flex items-center justify-end gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
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
          <a href={`tel:${a.telefone_principal}`} className="flex items-center justify-end gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
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
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-0.5">
          {aba === 'nascimento' ? '🎂' : '💍'}
          Aniversariantes
        </h1>
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
