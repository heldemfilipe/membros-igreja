"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import {
  ArrowLeft, BarChart3, ChevronLeft, ChevronRight, Download, Loader2, Lock, Printer, AlertTriangle,
} from 'lucide-react'
import { TIPOS_OFERTA, formatarBRL } from '@/lib/ofertas-shared'
import type { ResumoOfertas, Totais } from '@/lib/ofertas-resumo'
import { cn } from '@/lib/utils'

type Tipo = 'dia' | 'semana' | 'mes' | 'ano' | 'custom'

const TIPOS: { id: Tipo; label: string }[] = [
  { id: 'dia', label: 'Dia' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
  { id: 'ano', label: 'Ano' },
  { id: 'custom', label: 'Personalizado' },
]

const CORES: Record<string, string> = { dizimos: '#3b82f6', ofertas: '#10b981', missoes: '#f59e0b', outros: '#8b5cf6' }
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MESES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

function hojeLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const dataBR = (iso: string) => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}` }

function deslocar(ref: string, tipo: Tipo, passo: number): string {
  const [y, m, d] = ref.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (tipo === 'dia') dt.setUTCDate(dt.getUTCDate() + passo)
  else if (tipo === 'semana') dt.setUTCDate(dt.getUTCDate() + 7 * passo)
  else if (tipo === 'mes') { dt.setUTCDate(1); dt.setUTCMonth(dt.getUTCMonth() + passo) }
  else if (tipo === 'ano') dt.setUTCFullYear(dt.getUTCFullYear() + passo)
  return dt.toISOString().slice(0, 10)
}

function rotuloPeriodo(p: ResumoOfertas['periodo']): string {
  if (p.tipo === 'dia') {
    const [y, m, d] = p.inicio.split('-').map(Number)
    return `${DIAS[new Date(y, m - 1, d).getDay()]}, ${dataBR(p.inicio)}`
  }
  if (p.tipo === 'mes') {
    const [y, m] = p.inicio.split('-').map(Number)
    return `${MESES_LONGO[m - 1]} de ${y}`
  }
  if (p.tipo === 'ano') return p.inicio.slice(0, 4)
  return `${dataBR(p.inicio)} a ${dataBR(p.fim)}`
}

function variacao(atual: number, anterior: number): string {
  if (!anterior) return atual ? 'sem valor no período anterior' : 'igual ao período anterior'
  const pct = Math.round(((atual - anterior) / anterior) * 1000) / 10
  return `${pct > 0 ? '+' : ''}${pct.toLocaleString('pt-BR')}% vs. anterior (${formatarBRL(anterior)})`
}

function Linha({ nome, t, destaque }: { nome: string; t: Totais; destaque?: boolean }) {
  return (
    <tr className={cn('border-b border-border/60 last:border-0', destaque && 'font-semibold bg-muted/30')}>
      <td className="px-2 py-2">{nome}</td>
      {TIPOS_OFERTA.map(x => <td key={x.key} className="px-2 py-2 text-right">{formatarBRL(t[x.key])}</td>)}
      <td className="px-2 py-2 text-right font-semibold">{formatarBRL(t.total)}</td>
      <td className="px-2 py-2 text-right text-muted-foreground">{t.lancamentos}</td>
    </tr>
  )
}

function Tabela({ titulo, linhas, total }: { titulo: string; linhas: { nome: string; t: Totais }[]; total?: Totais }) {
  return (
    <div className="overflow-x-auto -mx-2">
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-left text-xs text-muted-foreground border-b border-border">
            <th className="px-2 py-2 font-medium">{titulo}</th>
            {TIPOS_OFERTA.map(x => <th key={x.key} className="px-2 py-2 font-medium text-right">{x.label}</th>)}
            <th className="px-2 py-2 font-medium text-right">Total</th>
            <th className="px-2 py-2 font-medium text-right">Lanç.</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map(l => <Linha key={l.nome} nome={l.nome} t={l.t} />)}
          {total && <Linha nome="Total" t={total} destaque />}
        </tbody>
      </table>
    </div>
  )
}

export default function ResumoOfertasPage() {
  const { token, isAdmin, permissoes, loading: authLoading, filtroCongregacao, filtroCongregacaoNome } = useAuth()
  const { toast } = useToast()
  const temAcesso = isAdmin || permissoes.ofertas_ver === true || permissoes.ofertas_editar === true

  const [tipo, setTipo] = useState<Tipo>('mes')
  const [ref, setRef] = useState(hojeLocal)
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [data, setData] = useState<ResumoOfertas | null>(null)
  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState(false)

  const query = useCallback(() => {
    const qs = new URLSearchParams({ periodo: tipo, ref })
    if (tipo === 'custom') { qs.set('inicio', inicio); qs.set('fim', fim) }
    if (filtroCongregacao) qs.set('congregacao', String(filtroCongregacao))
    return qs
  }, [tipo, ref, inicio, fim, filtroCongregacao])

  const carregar = useCallback(async () => {
    if (!token || !temAcesso) return
    if (tipo === 'custom' && (!inicio || !fim)) return
    setLoading(true)
    try {
      const res = await fetch(`/api/ofertas/resumo?${query()}`, { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (!res.ok) { toast({ title: json.error || 'Erro ao carregar.', variant: 'destructive' }); return }
      setData(json)
    } finally {
      setLoading(false)
    }
  }, [token, temAcesso, tipo, inicio, fim, query, toast])

  useEffect(() => { carregar() }, [carregar])

  const exportar = async () => {
    setExportando(true)
    try {
      const res = await fetch(`/api/ofertas/exportar?${query()}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        toast({ title: j.error || 'Erro ao exportar.', variant: 'destructive' })
        return
      }
      const nome = (res.headers.get('Content-Disposition') || '').match(/filename="([^"]+)"/)?.[1] || 'ofertas.xlsx'
      const url = URL.createObjectURL(await res.blob())
      const a = document.createElement('a')
      a.href = url
      a.download = nome
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExportando(false)
    }
  }

  if (authLoading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }
  if (!temAcesso) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center text-muted-foreground">
        <Lock className="h-8 w-8" />
        <p className="font-medium text-foreground">Acesso restrito</p>
        <p className="text-sm">O resumo de ofertas é para quem tem a permissão de ver ofertas.</p>
      </div>
    )
  }

  const hoje = hojeLocal()
  const serie = (data?.serie ?? [])
    .filter(s => (data?.granularidade === 'mes' ? s.chave <= hoje.slice(0, 7) : s.chave <= hoje))
    .map(s => ({
      ...s,
      rotulo: data?.granularidade === 'mes'
        ? MESES[Number(s.chave.slice(5, 7)) - 1]
        : `${s.chave.slice(8, 10)}/${s.chave.slice(5, 7)}`,
    }))
  const variasCongs = (data?.por_congregacao.length ?? 0) > 1

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/ofertas" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 print:hidden">
            <ArrowLeft className="h-3.5 w-3.5" /> Ofertas
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-2 mt-1"><BarChart3 className="h-6 w-6" /> Resumo de ofertas</h1>
          <p className="text-sm text-muted-foreground">
            {filtroCongregacaoNome ? `Congregação ${filtroCongregacaoNome}` : 'Todas as congregações que você acessa'}
            {data && ` · ${rotuloPeriodo(data.periodo)}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
            {TIPOS.map(t => (
              <button key={t.id} onClick={() => setTipo(t.id)}
                className={cn('px-3 py-1.5 text-sm rounded-md transition-colors',
                  tipo === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                {t.label}
              </button>
            ))}
          </div>
          {tipo !== 'custom' ? (
            <div className="inline-flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Período anterior" onClick={() => setRef(deslocar(ref, tipo, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setRef(hoje)} disabled={ref === hoje}>Hoje</Button>
              <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Próximo período" onClick={() => setRef(deslocar(ref, tipo, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2">
              <Input type="date" value={inicio} max={fim || undefined} onChange={e => setInicio(e.target.value)} className="h-9 w-40" aria-label="Data inicial" />
              <span className="text-sm text-muted-foreground">até</span>
              <Input type="date" value={fim} min={inicio || undefined} onChange={e => setFim(e.target.value)} className="h-9 w-40" aria-label="Data final" />
            </div>
          )}
          <Button variant="outline" onClick={exportar} disabled={!data || exportando}>
            {exportando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Excel
          </Button>
          <Button variant="outline" onClick={() => window.print()} disabled={!data}>
            <Printer className="h-4 w-4" /> Imprimir / PDF
          </Button>
        </div>
      </div>

      {tipo === 'custom' && (!inicio || !fim) && !data ? (
        <p className="text-sm text-muted-foreground">Escolha a data inicial e final.</p>
      ) : loading && !data ? (
        <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : data ? (
        <div className={cn('space-y-6 transition-opacity', loading && 'opacity-60')}>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <Card className="col-span-2 lg:col-span-1">
              <CardContent className="p-5">
                <p className="text-sm font-medium text-muted-foreground">Total</p>
                <p className="text-2xl font-bold mt-1 tabular-nums">{formatarBRL(data.atual.total)}</p>
                <p className="text-xs text-muted-foreground mt-1">{variacao(data.atual.total, data.anterior.total)}</p>
                <p className="text-xs text-muted-foreground">{data.atual.lancamentos} lançamento{data.atual.lancamentos !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
            {TIPOS_OFERTA.map(t => (
              <Card key={t.key}>
                <CardContent className="p-5">
                  <p className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: CORES[t.key] }} /> {t.label}
                  </p>
                  <p className="text-xl font-bold mt-1 tabular-nums">{formatarBRL(data.atual[t.key])}</p>
                  <p className="text-xs text-muted-foreground mt-1">{variacao(data.atual[t.key], data.anterior[t.key])}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {(data.sem_lancamento.length > 0 || data.nunca_lancaram.length > 0) && (
            <Card className="border-amber-500/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4" /> Cultos sem lançamento
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Pela agenda de cultos de cada congregação, até ontem, a partir do primeiro lançamento dela.
                </p>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {data.sem_lancamento.length > 0 && (
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {data.sem_lancamento.map(s => (
                      <li key={`${s.data}${s.congregacao}${s.culto}`} className="tabular-nums">
                        <span className="font-medium">{dataBR(s.data)}</span> {s.horario} — {s.culto}
                        {variasCongs && <span className="text-muted-foreground"> · {s.congregacao}</span>}
                      </li>
                    ))}
                  </ul>
                )}
                {data.sem_lancamento.length === 100 && <p className="text-xs text-muted-foreground">Mostrando os 100 mais recentes.</p>}
                {data.nunca_lancaram.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Ainda não lançaram nenhuma oferta: {data.nunca_lancaram.join(', ')}.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {data.periodo.tipo !== 'dia' && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Evolução</CardTitle>
                <p className="text-xs text-muted-foreground">{data.granularidade === 'mes' ? 'Por mês' : 'Por dia'}, empilhado por tipo</p>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={serie} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                      <XAxis dataKey="rotulo" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `R$ ${Number(v).toLocaleString('pt-BR')}`} width={80} />
                      <Tooltip formatter={(v: number) => formatarBRL(v)} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      {TIPOS_OFERTA.map(t => (
                        <Bar key={t.key} dataKey={t.key} name={t.label} stackId="a" fill={CORES[t.key]} />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {variasCongs && (
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Por congregação</CardTitle></CardHeader>
              <CardContent>
                <Tabela titulo="Congregação" linhas={data.por_congregacao.map(c => ({ nome: c.nome, t: c }))} total={data.atual} />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Por culto</CardTitle></CardHeader>
            <CardContent>
              {data.por_culto.length === 0
                ? <p className="text-sm text-muted-foreground">Nenhum lançamento no período.</p>
                : <Tabela titulo="Culto" linhas={data.por_culto.map(c => ({ nome: c.culto, t: c }))} total={variasCongs ? undefined : data.atual} />}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
