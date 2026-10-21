"use client"

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { CrescimentoData, CrescimentoItem } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { StatCard } from '@/components/dashboard/StatCard'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import {
  Users, UserPlus, UserMinus, TrendingUp, TrendingDown, DoorOpen, Loader2, ChevronLeft, ChevronRight, Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type Tipo = 'semana' | 'mes' | 'ano' | 'custom'

const TIPOS: { id: Tipo; label: string }[] = [
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mês' },
  { id: 'ano', label: 'Ano' },
  { id: 'custom', label: 'Personalizado' },
]

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const MESES_LONGO = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function hojeLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dataBR(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

/** Desloca a data de referência em um período (semana/mês/ano). */
function deslocar(ref: string, tipo: Tipo, passo: number): string {
  const [y, m, d] = ref.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  if (tipo === 'semana') dt.setUTCDate(dt.getUTCDate() + 7 * passo)
  else if (tipo === 'mes') { dt.setUTCDate(1); dt.setUTCMonth(dt.getUTCMonth() + passo) }
  else if (tipo === 'ano') dt.setUTCFullYear(dt.getUTCFullYear() + passo)
  return dt.toISOString().slice(0, 10)
}

function rotuloPeriodo(p: CrescimentoData['periodo']): string {
  if (p.tipo === 'mes') {
    const [y, m] = p.inicio.split('-').map(Number)
    return `${MESES_LONGO[m - 1]} de ${y}`
  }
  if (p.tipo === 'ano') return p.inicio.slice(0, 4)
  return `${dataBR(p.inicio)} a ${dataBR(p.fim)}`
}

function delta(atual: number, anterior: number): string {
  const dif = atual - anterior
  if (dif === 0) return 'igual ao período anterior'
  return `${dif > 0 ? '+' : ''}${dif} vs. período anterior (${anterior})`
}

/** Lista com barras: total ativo + destaque verde para quem entrou no período. */
function BarList({ itens, vazio = 'Sem dados no período.' }: { itens: CrescimentoItem[]; vazio?: string }) {
  const max = Math.max(1, ...itens.map(i => i.total))
  if (itens.length === 0) return <p className="text-sm text-muted-foreground">{vazio}</p>
  return (
    <ul className="space-y-2.5">
      {itens.map(i => (
        <li key={i.nome}>
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate">{i.nome}</span>
            <span className="tabular-nums shrink-0">
              <span className="font-semibold">{i.total}</span>
              {i.novos > 0 && <span className="ml-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">+{i.novos}</span>}
              {!!i.saidas && <span className="ml-1.5 text-xs font-medium text-red-600 dark:text-red-400">−{i.saidas}</span>}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full rounded-full bg-primary/70" style={{ width: `${(i.total / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function Secao({ titulo, subtitulo, children, className }: {
  titulo: string; subtitulo?: string; children: React.ReactNode; className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{titulo}</CardTitle>
        {subtitulo && <p className="text-xs text-muted-foreground">{subtitulo}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function CrescimentoInner() {
  const { token, filtroCongregacao, filtroCongregacaoNome } = useAuth()
  const [tipo, setTipo] = useState<Tipo>('mes')
  const [ref, setRef] = useState(hojeLocal)
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [data, setData] = useState<CrescimentoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    if (!token) return
    if (tipo === 'custom' && (!inicio || !fim)) return
    setLoading(true)
    setErro('')
    try {
      const qs = new URLSearchParams({ periodo: tipo, ref })
      if (tipo === 'custom') { qs.set('inicio', inicio); qs.set('fim', fim) }
      if (filtroCongregacao) qs.set('congregacao', String(filtroCongregacao))
      const res = await fetch(`/api/crescimento?${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (!res.ok) { setErro(json.error || 'Erro ao carregar o painel.'); return }
      setData(json)
    } catch {
      setErro('Erro de conexão ao carregar o painel.')
    } finally {
      setLoading(false)
    }
  }, [token, tipo, ref, inicio, fim, filtroCongregacao])

  useEffect(() => { carregar() }, [carregar])

  const r = data?.resumo
  const hoje = hojeLocal()
  const mesAtual = hoje.slice(0, 7)
  // Esconde meses futuros na evolução (visão anual mostra o ano inteiro).
  const serie = (data?.serie ?? [])
    .filter(s => s.mes <= mesAtual)
    .map(s => ({ ...s, rotulo: `${MESES[Number(s.mes.slice(5, 7)) - 1]}/${s.mes.slice(2, 4)}` }))

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-6xl mx-auto">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Crescimento</h1>
          <p className="text-sm text-muted-foreground">
            {filtroCongregacaoNome ? `Congregação ${filtroCongregacaoNome}` : 'Todas as congregações que você acessa'}
            {data && ` · ${rotuloPeriodo(data.periodo)}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
            {TIPOS.map(t => (
              <button
                key={t.id}
                onClick={() => setTipo(t.id)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-md transition-colors',
                  tipo === t.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
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
        </div>
      </div>

      {erro && <p className="text-sm text-destructive">{erro}</p>}

      {tipo === 'custom' && (!inicio || !fim) && !data ? (
        <p className="text-sm text-muted-foreground">Escolha a data inicial e final para ver o período.</p>
      ) : loading && !data ? (
        <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : data && r ? (
        <div className={cn('space-y-6 transition-opacity', loading && 'opacity-60')}>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <StatCard
              title="Ativos no fim"
              value={r.total_fim}
              icon={Users}
              colorClass="bg-blue-500"
              description={`${r.total_inicio} no início do período`}
            />
            <StatCard
              title="Novos"
              value={r.novos}
              icon={UserPlus}
              colorClass="bg-emerald-500"
              description={delta(r.novos, r.novos_ant)}
            />
            <StatCard
              title="Saídas"
              value={r.saidas}
              icon={UserMinus}
              colorClass="bg-red-500"
              description={delta(r.saidas, r.saidas_ant)}
            />
            <StatCard
              title="Saldo"
              value={`${r.saldo > 0 ? '+' : ''}${r.saldo}`}
              icon={r.saldo >= 0 ? TrendingUp : TrendingDown}
              colorClass={r.saldo >= 0 ? 'bg-violet-500' : 'bg-orange-500'}
              description={r.variacao_pct == null ? 'sem base de comparação' : `${r.variacao_pct > 0 ? '+' : ''}${r.variacao_pct}% sobre o início`}
            />
            <StatCard
              title="Visitantes"
              value={r.visitantes}
              icon={DoorOpen}
              colorClass="bg-amber-500"
              description="com visita no período"
            />
          </div>

          <Secao titulo="Evolução" subtitulo="Ativos ao fim de cada mês (linha) e entradas/saídas do mês (barras) — últimos 12 meses">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={serie} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="rotulo" tick={{ fontSize: 12 }} />
                  <YAxis yAxisId="total" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis yAxisId="mov" orientation="right" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="mov" dataKey="novos" name="Novos" fill="#10b981" radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="mov" dataKey="saidas" name="Saídas" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  <Line yAxisId="total" dataKey="total" name="Ativos" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Secao>

          <p className="text-xs text-muted-foreground -mt-3">
            Nas listas abaixo: número em destaque = ativos ao fim do período,{' '}
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">+n</span> entraram no período,{' '}
            <span className="text-red-600 dark:text-red-400 font-medium">−n</span> saíram.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <Secao titulo="Por sexo"><BarList itens={data.por_sexo} /></Secao>
            <Secao titulo="Por faixa etária" subtitulo="Faixas padrão (editáveis por congregação em breve)">
              <BarList itens={data.por_faixa} />
            </Secao>
            <Secao titulo="Por tipo"><BarList itens={data.por_tipo} /></Secao>
            <Secao titulo="Por departamento" subtitulo="Vínculo atual do membro com o departamento">
              <BarList
                itens={data.por_departamento.map(d => ({
                  ...d,
                  nome: filtroCongregacao || !d.congregacao_nome ? d.nome : `${d.nome} · ${d.congregacao_nome}`,
                }))}
              />
            </Secao>
          </div>

          <Secao titulo="Saídas por motivo" subtitulo="Saídas registradas no período">
            {data.saidas_por_motivo.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma saída no período.</p>
            ) : (
              <BarList itens={data.saidas_por_motivo.map(m => ({ nome: m.motivo, total: m.total, novos: 0 }))} />
            )}
          </Secao>

          {data.por_congregacao.length > 1 && (
            <Secao titulo="Comparativo entre congregações" subtitulo="“Jovens” usa a faixa padrão (18–35 anos)">
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="px-2 py-2 font-medium">Congregação</th>
                      <th className="px-2 py-2 font-medium text-right">Ativos</th>
                      <th className="px-2 py-2 font-medium text-right">Novos</th>
                      <th className="px-2 py-2 font-medium text-right">Saídas</th>
                      <th className="px-2 py-2 font-medium text-right">Saldo</th>
                      <th className="px-2 py-2 font-medium text-right">Jovens</th>
                    </tr>
                  </thead>
                  <tbody className="tabular-nums">
                    {data.por_congregacao.map(c => (
                      <tr key={c.nome} className="border-b border-border/60 last:border-0">
                        <td className="px-2 py-2">{c.nome}</td>
                        <td className="px-2 py-2 text-right font-semibold">{c.total}</td>
                        <td className="px-2 py-2 text-right text-emerald-600 dark:text-emerald-400">{c.novos}</td>
                        <td className="px-2 py-2 text-right text-red-600 dark:text-red-400">{c.saidas}</td>
                        <td className="px-2 py-2 text-right">{c.saldo > 0 ? '+' : ''}{c.saldo}</td>
                        <td className="px-2 py-2 text-right">{c.jovens}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Secao>
          )}

          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-4 w-4 shrink-0 mt-px" />
            <span>
              Conta Membros e Congregados (visitantes aparecem só no cartão próprio). Para cadastros antigos, a
              data de entrada é a data em que a pessoa foi cadastrada no sistema, então as entradas anteriores ao
              sistema aparecem juntas no período em que o cadastro foi feito.
            </span>
          </p>
        </div>
      ) : null}
    </div>
  )
}

export default function CrescimentoPage() {
  return (
    <RequirePermission perm="crescimento_ver">
      <CrescimentoInner />
    </RequirePermission>
  )
}
