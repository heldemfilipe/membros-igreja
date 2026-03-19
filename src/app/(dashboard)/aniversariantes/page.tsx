"use client"

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { AniversarianteItem, AniversarianteCasamento } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Loader2, Cake, Phone, Church } from 'lucide-react'
import { idadeFara, getDiaDoMes, cn } from '@/lib/utils'
import { getCargoStyle, getBoda } from '@/lib/constants'

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const TIPO_STYLE: Record<string, { card: string; avatar: string }> = {
  Membro:     { card: 'border-l-4 border-l-blue-500',    avatar: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  Congregado: { card: 'border-l-4 border-l-emerald-500', avatar: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  Visitante:  { card: 'border-l-4 border-l-amber-500',   avatar: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
}

function anosDeCasamento(data_casamento: string): number {
  const parts = data_casamento.split('T')[0].split('-').map(Number)
  return new Date().getFullYear() - parts[0]
}

export default function AniversariantesPage() {
  const searchParams = useSearchParams()
  const { token, filtroCongregacao } = useAuth()
  const [aba, setAba] = useState<'nascimento' | 'casamento'>(
    searchParams.get('aba') === 'casamento' ? 'casamento' : 'nascimento'
  )
  const [mes, setMes] = useState(new Date().getMonth() + 1)

  // Nascimento
  const [aniversariantes, setAniversariantes] = useState<AniversarianteItem[]>([])
  const [loadingNasc, setLoadingNasc] = useState(false)

  // Casamento
  const [anivCasamento, setAnivCasamento] = useState<AniversarianteCasamento[]>([])
  const [loadingCas, setLoadingCas] = useState(false)

  // Dialog boda
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
  const totalLabel = aba === 'nascimento'
    ? `${aniversariantes.length} aniversariante${aniversariantes.length !== 1 ? 's' : ''} em ${MESES[mes - 1]}`
    : `${anivCasamento.length} aniversário${anivCasamento.length !== 1 ? 's' : ''} de casamento em ${MESES[mes - 1]}`

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            {aba === 'nascimento' ? <Cake className="h-6 w-6 text-yellow-500" /> : <span className="text-2xl leading-none">💍</span>}
            Aniversariantes
          </h1>
          <p className="text-sm text-muted-foreground">
            {loading ? '...' : totalLabel}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
          {/* Tabs */}
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

          {/* Seletor de mês */}
          <select
            value={mes}
            onChange={e => setMes(Number(e.target.value))}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-full sm:w-auto"
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
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Nenhum aniversariante em {MESES[mes - 1]}.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {aniversariantes.map(a => {
              const dia = getDiaDoMes(a.data_nascimento)
              const idadeQ = idadeFara(a.data_nascimento)
              const tipoStyle = TIPO_STYLE[a.tipo_participante] || { card: '', avatar: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' }
              return (
                <Card key={a.id} className={cn('hover:shadow-md transition-shadow', tipoStyle.card)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl select-none', tipoStyle.avatar)}>
                        🎂
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm leading-tight">{a.nome}</p>
                        {a.conhecido_como && (
                          <p className="text-xs text-muted-foreground">&quot;{a.conhecido_como}&quot;</p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <Badge variant="outline" className="text-xs font-medium">
                            Dia {dia}{idadeQ !== null ? ` · Fará ${idadeQ} anos` : ''}
                          </Badge>
                          {a.cargo && (
                            <Badge className="text-xs" style={getCargoStyle(a.cargo)}>{a.cargo}</Badge>
                          )}
                        </div>
                        {a.telefone_principal && (
                          <a href={`tel:${a.telefone_principal}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-1.5 w-fit transition-colors">
                            <Phone className="h-3 w-3" />{a.telefone_principal}
                          </a>
                        )}
                        {!filtroCongregacao && a.igreja && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1 w-fit">
                            <Church className="h-3 w-3 shrink-0" />{a.igreja}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      ) : (
        /* ─── Aba Casamento ─── */
        anivCasamento.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              Nenhum aniversário de casamento em {MESES[mes - 1]}.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {anivCasamento.map(a => {
              const dia = getDiaDoMes(a.data_casamento)
              const anos = anosDeCasamento(a.data_casamento)
              const boda = getBoda(anos)
              const tipoStyle = TIPO_STYLE[a.tipo_participante] || { card: 'border-l-4 border-l-rose-400', avatar: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' }
              const nomeExibido = a.conjuge_nome ? `${a.nome} + ${a.conjuge_nome}` : a.nome
              return (
                <Card key={a.id} className={cn('hover:shadow-md transition-shadow', tipoStyle.card)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl select-none', tipoStyle.avatar)}>
                        💍
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm leading-tight">{nomeExibido}</p>

                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <Badge variant="outline" className="text-xs font-medium">
                            Dia {dia} · {anos} {anos === 1 ? 'ano' : 'anos'}
                          </Badge>
                          {boda && (
                            <Badge
                              variant="outline"
                              onClick={() => setBodaDialog({ ...boda, anos })}
                              className="text-xs font-medium cursor-pointer border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                            >
                              💍 {boda.nome}
                            </Badge>
                          )}
                        </div>

                        {a.telefone_principal && (
                          <a href={`tel:${a.telefone_principal}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-1.5 w-fit transition-colors">
                            <Phone className="h-3 w-3" />{a.telefone_principal}
                          </a>
                        )}
                        {!filtroCongregacao && a.igreja && (
                          <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1 w-fit">
                            <Church className="h-3 w-3 shrink-0" />{a.igreja}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )
      )}

      {/* Dialog de Boda */}
      {bodaDialog && (
        <Dialog open onOpenChange={() => setBodaDialog(null)}>
          <DialogContent className="max-w-sm">
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
