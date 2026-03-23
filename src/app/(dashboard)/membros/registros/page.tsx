"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import { Loader2, Search, Pencil, Check, X, Phone, Church, Calendar } from 'lucide-react'
import { cn, formatarData } from '@/lib/utils'
import { TIPO_STYLE } from '@/lib/constants'

type MembroRegistro = {
  id: number
  nome: string
  conhecido_como: string | null
  tipo_participante: string
  sexo: string
  data_nascimento: string | null
  data_casamento: string | null
  igreja: string | null
  telefone_principal: string | null
}

type Resposta = {
  total: number
  com_data: number
  sem_data: number
  porcentagem: number
  membros: MembroRegistro[]
}

type Aba = 'nascimento' | 'casamento'
type Status = 'todos' | 'com' | 'sem'

// ─── Barra de progresso ───────────────────────────────────────────────────────
function ProgressBar({ porcentagem, cor }: { porcentagem: number; cor: string }) {
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-500', cor)}
        style={{ width: `${porcentagem}%` }}
      />
    </div>
  )
}

// ─── Linha de membro ──────────────────────────────────────────────────────────
function LinhaRegistro({
  m,
  campo,
  podeEditar,
  filtroCongregacao,
  onSaved,
}: {
  m: MembroRegistro
  campo: 'data_nascimento' | 'data_casamento'
  podeEditar: boolean
  filtroCongregacao: number | null
  onSaved: (id: number, valor: string | null) => void
}) {
  const { token } = useAuth()
  const { toast } = useToast()
  const [editing, setEditing] = useState(false)
  const [valor, setValor] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const dataAtual = m[campo]
  const tipoStyle = TIPO_STYLE[m.tipo_participante] || { card: '', avatar: 'bg-primary/10 text-primary' }
  const temData = !!dataAtual

  const iniciarEdicao = () => {
    if (!podeEditar) return
    const iso = dataAtual ? dataAtual.split('T')[0] : ''
    setValor(iso)
    setEditing(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const cancelar = () => {
    setEditing(false)
    setValor('')
  }

  const salvar = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/membros/registros', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: m.id, campo, valor: valor || null }),
      })
      if (!res.ok) throw new Error()
      onSaved(m.id, valor || null)
      setEditing(false)
      toast({ title: 'Data atualizada.' })
    } catch {
      toast({ title: 'Erro ao salvar.', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-2.5 bg-card rounded-xl border transition-shadow hover:shadow-sm',
      tipoStyle.card,
    )}>
      {/* Avatar */}
      <div className={cn('flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold select-none', tipoStyle.avatar)}>
        {m.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm leading-tight truncate">{m.nome}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          <span className="text-xs text-muted-foreground">{m.tipo_participante}</span>
          {!filtroCongregacao && m.igreja && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Church className="h-3 w-3 shrink-0" />{m.igreja}
            </span>
          )}
        </div>
      </div>

      {/* Data / Edição */}
      <div className="flex items-center gap-2 shrink-0">
        {editing ? (
          <>
            <input
              ref={inputRef}
              type="date"
              value={valor}
              onChange={e => setValor(e.target.value)}
              className="h-8 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring w-36"
              onKeyDown={e => { if (e.key === 'Enter') salvar(); if (e.key === 'Escape') cancelar() }}
            />
            <button
              onClick={salvar}
              disabled={saving}
              className="p-1.5 rounded-md bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={cancelar}
              className="p-1.5 rounded-md bg-muted text-muted-foreground hover:bg-accent transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            {temData ? (
              <Badge variant="outline" className="text-xs font-medium gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700">
                <Calendar className="h-3 w-3" />
                {formatarData(dataAtual!)}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs font-medium text-muted-foreground border-dashed">
                Não cadastrado
              </Badge>
            )}
            {podeEditar && (
              <button
                onClick={iniciarEdicao}
                title="Editar data"
                className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function RegistrosPage() {
  const { token, isAdmin, temPermissao, filtroCongregacao } = useAuth()
  const { toast } = useToast()

  const podeVer = isAdmin || temPermissao('registros_ver') || temPermissao('registros_editar')
  const podeEditar = isAdmin || temPermissao('registros_editar')

  const [aba, setAba] = useState<Aba>('nascimento')
  const [status, setStatus] = useState<Status>('todos')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [dados, setDados] = useState<Resposta | null>(null)
  const [loading, setLoading] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  const campo = aba === 'nascimento' ? 'data_nascimento' : 'data_casamento'

  const carregar = useCallback(async () => {
    if (!token || !podeVer) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ campo: aba, status })
      if (search) params.set('search', search)
      if (filtroCongregacao) params.set('congregacao', String(filtroCongregacao))
      const res = await fetch(`/api/membros/registros?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setDados(await res.json())
    } finally {
      setLoading(false)
    }
  }, [token, podeVer, aba, status, search, filtroCongregacao])

  useEffect(() => { carregar() }, [carregar])

  const handleSearch = (val: string) => {
    setSearchInput(val)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => setSearch(val), 300)
  }

  const handleSaved = (id: number, valor: string | null) => {
    setDados(prev => {
      if (!prev) return prev
      const membros = prev.membros.map(m =>
        m.id === id ? { ...m, [campo]: valor } : m
      )
      const com_data = membros.filter(m => m[campo] !== null).length
      const sem_data = membros.length - com_data
      const porcentagem = membros.length > 0 ? Math.round((com_data / membros.length) * 100) : 0
      return { ...prev, membros, com_data, sem_data, porcentagem }
    })
  }

  if (!podeVer) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold text-muted-foreground">Acesso restrito</p>
        <p className="text-sm text-muted-foreground mt-1">Você não tem permissão para acessar esta tela.</p>
      </div>
    )
  }

  const corBarra = aba === 'nascimento' ? 'bg-blue-500' : 'bg-rose-500'
  const corCom = aba === 'nascimento' ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'
  const corSem = 'text-amber-600 dark:text-amber-400'

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 mb-0.5">
          📋 Completude de Registros
        </h1>
        <p className="text-sm text-muted-foreground">
          Controle de membros com e sem datas cadastradas
        </p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-lg border border-border overflow-hidden w-fit">
        {(['nascimento', 'casamento'] as Aba[]).map((t) => (
          <button
            key={t}
            onClick={() => { setAba(t); setStatus('todos') }}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors',
              t === 'casamento' && 'border-l border-border',
              aba === t
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {t === 'nascimento' ? '🎂 Aniversário' : '💍 Casamento'}
          </button>
        ))}
      </div>

      {/* Stats */}
      {dados && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-card border rounded-xl p-4">
            <p className="text-xs text-muted-foreground font-medium">Total de membros</p>
            <p className="text-3xl font-bold tabular-nums mt-1">{dados.total}</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className={cn('text-xs font-medium', corCom)}>Com data cadastrada</p>
            <p className="text-3xl font-bold tabular-nums mt-1">{dados.com_data}</p>
            <p className={cn('text-xs font-semibold mt-0.5', corCom)}>{dados.porcentagem}%</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className={cn('text-xs font-medium', corSem)}>Sem data cadastrada</p>
            <p className="text-3xl font-bold tabular-nums mt-1">{dados.sem_data}</p>
            <p className={cn('text-xs font-semibold mt-0.5', corSem)}>
              {dados.total > 0 ? 100 - dados.porcentagem : 0}%
            </p>
          </div>
        </div>
      )}

      {dados && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Completude</span>
            <span className="font-medium">{dados.porcentagem}%</span>
          </div>
          <ProgressBar porcentagem={dados.porcentagem} cor={corBarra} />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Busca */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar membro..."
            value={searchInput}
            onChange={e => handleSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Status */}
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          {([['todos', 'Todos'], ['com', 'Com data'], ['sem', 'Sem data']] as [Status, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setStatus(val)}
              className={cn(
                'px-3 py-2 text-xs font-medium transition-colors',
                val !== 'todos' && 'border-l border-border',
                status === val
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : !dados || dados.membros.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">
          {status === 'sem'
            ? `Todos os membros já têm ${aba === 'nascimento' ? 'data de nascimento' : 'data de casamento'} cadastrada! 🎉`
            : 'Nenhum membro encontrado.'}
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {dados.membros.length} {dados.membros.length === 1 ? 'membro' : 'membros'} encontrado{dados.membros.length !== 1 ? 's' : ''}
            {podeEditar && <span className="ml-1">· clique em ✏️ para editar a data</span>}
          </p>
          {dados.membros.map(m => (
            <LinhaRegistro
              key={m.id}
              m={m}
              campo={campo}
              podeEditar={podeEditar}
              filtroCongregacao={filtroCongregacao}
              onSaved={handleSaved}
            />
          ))}
        </div>
      )}
    </div>
  )
}
