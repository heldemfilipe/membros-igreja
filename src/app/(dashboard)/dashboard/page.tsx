"use client"

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { DashboardData, AniversarianteItem, VisitaRecente, VisitanteFrequente } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { StatCard } from '@/components/dashboard/StatCard'
import { MemberModal } from '@/components/membros/MemberModal'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, LabelList,
} from 'recharts'
import {
  Users, UserCheck, UserCircle, Loader2, Cake, CalendarDays,
  TrendingUp, Activity, UserPlus,
} from 'lucide-react'
import Link from 'next/link'
import { getDiaDoMes } from '@/lib/utils'
import { CARGO_COLORS, getDeptColor } from '@/lib/constants'

// ---------- paletas de cores ----------
const CORES_PIE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16']
const SEXO_CORES: Record<string, string> = { Masculino: '#3b82f6', Feminino: '#ec4899' }
const TIPO_CORES: Record<string, string> = { Membro: '#3b82f6', Congregado: '#10b981', Visitante: '#f59e0b' }
const FAIXA_CORES = ['#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

const fmt = (v: number) => v.toString()

// Tooltip customizado para barras
const BarTooltip = ({ active, payload, label }: {
  active?: boolean; payload?: { value: number }[]; label?: string
}) => {
  if (active && payload?.length) {
    return (
      <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-md text-sm">
        <p className="font-medium">{label}</p>
        <p className="text-muted-foreground">{payload[0].value} {payload[0].value === 1 ? 'pessoa' : 'pessoas'}</p>
      </div>
    )
  }
  return null
}

// Donut + lista de valores com total no centro
const DonutComLista = ({
  data, colors, height = 170,
}: {
  data: { name: string; value: number }[]
  colors: string[]
  height?: number
}) => {
  const total = data.reduce((s, d) => s + d.value, 0)
  const innerR = Math.round(height * 0.27)
  const outerR = Math.round(height * 0.43)

  return (
    <div className="flex items-center gap-4">
      {/* Donut com total no centro */}
      <div className="flex-shrink-0 relative" style={{ width: height, height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerR}
              outerRadius={outerR}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip formatter={(v: number) => [v, 'pessoas']} />
          </PieChart>
        </ResponsiveContainer>
        {/* Total no centro do donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-2xl font-bold tabular-nums leading-none">{total}</span>
          <span className="text-[10px] text-muted-foreground mt-0.5">total</span>
        </div>
      </div>

      {/* Lista de itens */}
      <div className="flex-1 space-y-2 min-w-0">
        {data.map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: colors[i % colors.length] }}
              />
              <span className="text-sm truncate">{d.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-base font-bold tabular-nums">{d.value}</span>
              <span className="text-muted-foreground text-xs tabular-nums w-8 text-right">
                {total > 0 ? Math.round((d.value / total) * 100) : 0}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

type FiltroSemana = 'esta' | 'anterior' | 'ambas'

// ─── Formata data de visita legível ─────────────────────────────────────────
function fmtDataVisita(iso: string): string {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number)
  const data = new Date(y, m - 1, d)
  const hoje = new Date()
  const ontem = new Date(hoje)
  ontem.setDate(hoje.getDate() - 1)
  if (data.toDateString() === hoje.toDateString()) return 'Hoje'
  if (data.toDateString() === ontem.toDateString()) return 'Ontem'
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ─── Página ──────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { token } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [todosAniv, setTodosAniv] = useState<AniversarianteItem[]>([])
  const [filtroSemana, setFiltroSemana] = useState<FiltroSemana>('esta')
  const [loading, setLoading] = useState(true)

  // Visitas
  const [visitasRecentes, setVisitasRecentes] = useState<VisitaRecente[]>([])
  const [visitantesFrequentes, setVisitantesFrequentes] = useState<VisitanteFrequente[]>([])

  // Modal para promover visitante a membro
  const [memberModal, setMemberModal] = useState<{ open: boolean; id?: number }>({ open: false })

  // ─── Loader principal ────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => { loadData() }, [loadData])

  // Aniversariantes (mês atual + anterior)
  useEffect(() => {
    if (!token) return
    const hoje = new Date()
    const mes = hoje.getMonth() + 1
    const mesAnterior = mes === 1 ? 12 : mes - 1
    Promise.all([
      fetch(`/api/aniversariantes?mes=${mes}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`/api/aniversariantes?mes=${mesAnterior}`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([listaMes, listaMesAnt]: [AniversarianteItem[], AniversarianteItem[]]) => {
        setTodosAniv([...(listaMesAnt || []), ...(listaMes || [])])
      })
      .catch(() => {})
  }, [token])

  // Visitas recentes + frequentes
  const loadVisitas = useCallback(async () => {
    if (!token) return
    try {
      const [rec, freq] = await Promise.all([
        fetch('/api/visitas?tipo=recentes&limit=10', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
        fetch('/api/visitas?tipo=frequentes&dias=28', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.ok ? r.json() : []),
      ])
      setVisitasRecentes(rec || [])
      setVisitantesFrequentes(freq || [])
    } catch { /**/ }
  }, [token])

  useEffect(() => { loadVisitas() }, [loadVisitas])

  // ─── Filtro de semana ────────────────────────────────────────────────────

  const anivFiltrados = useMemo(() => {
    const hoje = new Date()
    const domingo = new Date(hoje)
    domingo.setDate(hoje.getDate() - hoje.getDay())
    domingo.setHours(0, 0, 0, 0)
    const sabado = new Date(domingo)
    sabado.setDate(domingo.getDate() + 6)
    sabado.setHours(23, 59, 59, 999)
    const domingoAnt = new Date(domingo)
    domingoAnt.setDate(domingo.getDate() - 7)
    const sabadoAnt = new Date(domingo)
    sabadoAnt.setDate(domingo.getDate() - 1)
    sabadoAnt.setHours(23, 59, 59, 999)

    return todosAniv.filter(a => {
      const parts = a.data_nascimento.split('T')[0].split('-').map(Number)
      const deste = new Date(hoje.getFullYear(), parts[1] - 1, parts[2])
      if (filtroSemana === 'esta') return deste >= domingo && deste <= sabado
      if (filtroSemana === 'anterior') return deste >= domingoAnt && deste <= sabadoAnt
      return deste >= domingoAnt && deste <= sabado
    })
  }, [todosAniv, filtroSemana])

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!data) return null

  // ─── Prepara dados dos gráficos ───────────────────────────────────────────

  const dadosTipo = data.por_tipo.map(d => ({ name: d.tipo_participante, value: parseInt(d.total) }))
  const coresTipo = dadosTipo.map(d => TIPO_CORES[d.name] || CORES_PIE[0])

  const dadosSexo = data.por_sexo.map(d => ({ name: d.sexo, value: parseInt(d.total) }))
  const coresSexo = dadosSexo.map(d => SEXO_CORES[d.name] || CORES_PIE[0])

  const dadosCargo = data.por_cargo.map(d => ({ name: d.cargo, value: parseInt(d.total) }))

  const dadosFaixa = data.por_faixa_etaria.map(d => ({
    name: d.faixa.replace(' anos', '').replace('Acima de 60', '60+'),
    value: parseInt(d.total),
  }))

  const dadosDept = data.por_departamento
    .filter(d => d.departamento !== 'Sem Departamento')
    .map(d => ({ name: d.departamento, value: parseInt(d.total) }))
    .sort((a, b) => b.value - a.value)

  const dadosEstadoCivil = (data.por_estado_civil || []).map(d => ({
    name: d.estado_civil,
    value: parseInt(d.total),
  }))

  const labelFiltro = filtroSemana === 'esta' ? 'desta semana' : filtroSemana === 'anterior' ? 'da semana anterior' : 'das duas semanas'

  // Limites da semana atual (para colorir pills dos aniversariantes)
  const _hoje = new Date()
  const _domingo = new Date(_hoje)
  _domingo.setDate(_hoje.getDate() - _hoje.getDay())
  _domingo.setHours(0, 0, 0, 0)
  const _sabado = new Date(_domingo)
  _sabado.setDate(_domingo.getDate() + 6)
  _sabado.setHours(23, 59, 59, 999)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral da congregação</p>
      </div>

      {/* ─── Cards de totais ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total Geral" value={data.total_geral} icon={Users} colorClass="bg-blue-500" description="membros e congregados" />
        <StatCard title="Membros" value={data.total_membros} icon={UserCheck} colorClass="bg-emerald-500" description="membros efetivos" />
        <StatCard title="Congregados" value={data.total_congregados} icon={UserCircle} colorClass="bg-violet-500" description="frequentadores regulares" />
      </div>

      {/* ─── Visitantes Frequentes — sugestão de promoção ────────────────── */}
      {visitantesFrequentes.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-900/10 dark:border-orange-700/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-2.5">
              <TrendingUp className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-2">
                  Visitantes frequentes — possíveis membros
                </p>
                <div className="flex flex-wrap gap-2">
                  {visitantesFrequentes.map(v => (
                    <div
                      key={v.membro_id}
                      className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/40 rounded-lg px-3 py-1.5"
                    >
                      <div>
                        <p className="text-xs font-semibold text-orange-900 dark:text-orange-200 leading-tight">
                          {v.nome}
                        </p>
                        <p className="text-[10px] text-orange-700 dark:text-orange-400">
                          {v.total_visitas} visita{Number(v.total_visitas) !== 1 ? 's' : ''} · 28 dias
                        </p>
                      </div>
                      <Button
                        size="sm"
                        className="h-6 text-[10px] px-2 bg-orange-600 hover:bg-orange-700 text-white shrink-0"
                        onClick={() => setMemberModal({ open: true, id: v.membro_id })}
                      >
                        <UserPlus className="h-3 w-3 mr-1" />
                        Cadastrar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Últimas Visitas + Atividade Recente ─────────────────────────── */}
      {visitasRecentes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Últimas visitas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Últimas Visitas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {visitasRecentes.slice(0, 8).map((v, i) => (
                  <div key={v.id ?? i} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                        {v.nome.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate leading-tight">{v.nome}</p>
                        {v.telefone_principal && (
                          <p className="text-[10px] text-muted-foreground">{v.telefone_principal}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 font-medium">
                      {fmtDataVisita(v.data_visita)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t">
                <Link
                  href="/membros?tipo=Visitante"
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Users className="h-3 w-3" />
                  Ver todos os visitantes →
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Atividade recente — novos membros */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-emerald-500" />
                Membros Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <RecentMembros token={token} />
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Aniversariantes ─────────────────────────────────────────────── */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800/50">
        <CardContent className="p-4">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Cake className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                  🎂 Aniversariantes {labelFiltro}
                  {anivFiltrados.length > 0 && (
                    <span className="ml-1.5 bg-amber-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {anivFiltrados.length}
                    </span>
                  )}
                </p>
              </div>
              {/* Filtros com cores distintas por semana */}
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setFiltroSemana('esta')}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    filtroSemana === 'esta'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800'
                  }`}
                >
                  Esta semana
                </button>
                <button
                  onClick={() => setFiltroSemana('anterior')}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    filtroSemana === 'anterior'
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-800'
                  }`}
                >
                  Semana anterior
                </button>
                <button
                  onClick={() => setFiltroSemana('ambas')}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    filtroSemana === 'ambas'
                      ? 'bg-slate-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  Ambas as semanas
                </button>
              </div>
            </div>

            {/* Legenda de cores */}
            <div className="flex gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Esta semana
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-violet-500 inline-block" />
                Semana anterior
              </span>
            </div>

            {anivFiltrados.length === 0 ? (
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Nenhum aniversariante {labelFiltro}.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {anivFiltrados.map(a => {
                  const dia = getDiaDoMes(a.data_nascimento)
                  const mesNum = parseInt(a.data_nascimento.split('T')[0].split('-')[1]).toString().padStart(2, '0')
                  // Determina a semana do aniversariante (independente do filtro selecionado)
                  const parts = a.data_nascimento.split('T')[0].split('-').map(Number)
                  const deste = new Date(_hoje.getFullYear(), parts[1] - 1, parts[2])
                  const isEstaSemana = deste >= _domingo && deste <= _sabado
                  return (
                    <span
                      key={a.id}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        isEstaSemana
                          ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800'
                          : 'bg-violet-100 dark:bg-violet-900/40 text-violet-900 dark:text-violet-300 ring-1 ring-violet-200 dark:ring-violet-800'
                      }`}
                    >
                      {a.nome} ({dia}/{mesNum})
                    </span>
                  )
                })}
              </div>
            )}

            {/* CTA — botão destacado */}
            <div className="pt-1">
              <Link href="/aniversariantes">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Ver todos os aniversariantes
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Gráficos — Por Tipo + Por Sexo ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Por Tipo de Participante</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DonutComLista data={dadosTipo} colors={coresTipo} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Por Sexo</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DonutComLista data={dadosSexo} colors={coresSexo} />
          </CardContent>
        </Card>
      </div>

      {/* ─── Gráficos — Faixa Etária + Estado Civil ──────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Por Faixa Etária</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="w-full overflow-hidden">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dadosFaixa} margin={{ top: 20, right: 8, left: -28, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip content={<BarTooltip />} />
                  <Bar dataKey="value" radius={[5, 5, 0, 0]}>
                    {dadosFaixa.map((_, i) => <Cell key={i} fill={FAIXA_CORES[i % FAIXA_CORES.length]} />)}
                    <LabelList dataKey="value" position="top" formatter={fmt} style={{ fontSize: 11, fill: 'currentColor' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              {dadosFaixa.map((d, i) => (
                <span key={i} className="flex items-center gap-1.5 text-xs">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: FAIXA_CORES[i % FAIXA_CORES.length] }} />
                  <span className="text-muted-foreground">{d.name}:</span>
                  <span className="font-semibold">{d.value}</span>
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {dadosEstadoCivil.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Por Estado Civil</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <DonutComLista data={dadosEstadoCivil} colors={CORES_PIE} />
            </CardContent>
          </Card>
        ) : (
          data.estatisticas_idade.total_com_idade > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Estatísticas de Idade</CardTitle>
              </CardHeader>
              <CardContent className="pt-4 flex flex-wrap gap-8 items-center">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Idade Média</p>
                  <p className="text-5xl font-bold tabular-nums text-primary mt-1">{data.estatisticas_idade.idade_media}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">anos</p>
                </div>
                <div className="border-l pl-8">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Com nascimento</p>
                  <p className="text-5xl font-bold tabular-nums text-primary mt-1">{data.estatisticas_idade.total_com_idade}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">membros</p>
                </div>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* ─── Por Cargo Eclesiástico ───────────────────────────────────────── */}
      {dadosCargo.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Por Cargo Eclesiástico</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-4 items-start">
              <div className="flex-1 overflow-hidden">
                <ResponsiveContainer width="100%" height={Math.max(140, dadosCargo.length * 38)}>
                  <BarChart data={dadosCargo} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 4 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                    <Tooltip content={<BarTooltip />} />
                    <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                      {dadosCargo.map((d, i) => (
                        <Cell key={i} fill={CARGO_COLORS[d.name]?.bg || CORES_PIE[i % CORES_PIE.length]} />
                      ))}
                      <LabelList dataKey="value" position="right" formatter={fmt} style={{ fontSize: 11, fill: 'currentColor' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="shrink-0 space-y-[9px] pt-1">
                {dadosCargo.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: CARGO_COLORS[d.name]?.bg || CORES_PIE[i % CORES_PIE.length] }} />
                    <span className="text-sm font-bold tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Por Departamento ────────────────────────────────────────────── */}
      {dadosDept.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Por Departamento</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex gap-4 items-start">
              <div className="flex-1 overflow-hidden">
                <ResponsiveContainer width="100%" height={Math.max(140, dadosDept.length * 38)}>
                  <BarChart data={dadosDept} layout="vertical" margin={{ top: 4, right: 40, left: 0, bottom: 4 }}>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip content={<BarTooltip />} />
                    <Bar dataKey="value" radius={[0, 5, 5, 0]}>
                      {dadosDept.map((d, i) => (
                        <Cell key={i} fill={getDeptColor(d.name)} />
                      ))}
                      <LabelList dataKey="value" position="right" formatter={fmt} style={{ fontSize: 11, fill: 'currentColor' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="shrink-0 space-y-[9px] pt-1">
                {dadosDept.map((d, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ backgroundColor: getDeptColor(d.name) }} />
                    <span className="text-sm font-bold tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Estatísticas de Idade ────────────────────────────────────────── */}
      {dadosEstadoCivil.length > 0 && data.estatisticas_idade.total_com_idade > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex flex-wrap items-center gap-8">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Idade Média</p>
                <p className="text-4xl font-bold tabular-nums text-primary mt-1">{data.estatisticas_idade.idade_media}</p>
                <p className="text-xs text-muted-foreground mt-0.5">anos</p>
              </div>
              <div className="border-l pl-8">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Com data de nascimento</p>
                <p className="text-4xl font-bold tabular-nums text-primary mt-1">{data.estatisticas_idade.total_com_idade}</p>
                <p className="text-xs text-muted-foreground mt-0.5">membros</p>
              </div>
              {data.total_geral > 0 && (
                <div className="border-l pl-8">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Cobertura</p>
                  <p className="text-4xl font-bold tabular-nums text-primary mt-1">
                    {Math.round((data.estatisticas_idade.total_com_idade / data.total_geral) * 100)}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">dados completos</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal para promover visitante a membro */}
      <MemberModal
        open={memberModal.open}
        membroId={memberModal.id}
        onClose={() => setMemberModal({ open: false })}
        onSuccess={() => { loadData(); loadVisitas() }}
      />
    </div>
  )
}

// ─── Subcomponente: Membros Recentes ─────────────────────────────────────────
function RecentMembros({ token }: { token: string | null }) {
  const [membros, setMembros] = useState<{ id: number; nome: string; tipo_participante: string; created_at: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    fetch('/api/membros?order=recentes&limit=8', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: number; nome: string; tipo_participante: string; created_at: string }[]) => {
        // Ordena por created_at mais recente e pega os 8 primeiros
        const sorted = (data || [])
          .filter(m => m.created_at)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 8)
        setMembros(sorted)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
  if (membros.length === 0) return <p className="text-sm text-muted-foreground">Nenhum cadastro recente.</p>

  const TIPO_CORES_TEXT: Record<string, string> = {
    Membro: 'text-blue-600 dark:text-blue-400',
    Congregado: 'text-emerald-600 dark:text-emerald-400',
    Visitante: 'text-amber-600 dark:text-amber-400',
  }

  return (
    <div className="space-y-2">
      {membros.map(m => (
        <div key={m.id} className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center text-[10px] font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
              {m.nome.slice(0, 2).toUpperCase()}
            </div>
            <p className="text-sm font-medium truncate leading-tight">{m.nome}</p>
          </div>
          <span className={`text-xs shrink-0 font-medium ${TIPO_CORES_TEXT[m.tipo_participante] || 'text-muted-foreground'}`}>
            {m.tipo_participante}
          </span>
        </div>
      ))}
      <div className="pt-2 border-t">
        <Link href="/membros" className="text-xs text-primary hover:underline flex items-center gap-1">
          <Users className="h-3 w-3" />
          Ver todos os membros →
        </Link>
      </div>
    </div>
  )
}
