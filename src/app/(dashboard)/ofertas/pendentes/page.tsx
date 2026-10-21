"use client"

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { PessoaPicker, type PessoaEscolhida } from '@/components/ofertas/PessoaPicker'
import { ArrowLeft, Loader2, UserPlus, Link2, X, RotateCcw, Phone, Lock } from 'lucide-react'
import { formatarData } from '@/lib/utils'

type Pendente = {
  id: number
  nome: string
  telefone: string | null
  status: 'pendente' | 'cadastrado' | 'descartado'
  created_at: string
  congregacao_id: number
  congregacao_nome: string
  membro_id: number | null
  membro_nome: string | null
  qtd_lancamentos: number
  ultimo_culto: string | null
}

type Status = 'pendente' | 'cadastrado' | 'descartado' | 'todos'

const STATUS: { id: Status; label: string }[] = [
  { id: 'pendente', label: 'Pendentes' },
  { id: 'cadastrado', label: 'Cadastrados' },
  { id: 'descartado', label: 'Descartados' },
  { id: 'todos', label: 'Todos' },
]

export default function PendentesPage() {
  const { token, isAdmin, permissoes, loading: authLoading, filtroCongregacao, temPermissao } = useAuth()
  const { toast } = useToast()
  const flag = (k: string) => isAdmin || permissoes[k] === true
  const podeLancar = flag('ofertas_lancar')
  const podeCadastrar = temPermissao('membros_editar')
  const temAcesso = podeLancar || flag('ofertas_ver') || flag('ofertas_editar') || podeCadastrar
  const podeResolver = podeCadastrar || podeLancar || flag('ofertas_editar')

  const [status, setStatus] = useState<Status>('pendente')
  const [lista, setLista] = useState<Pendente[]>([])
  const [loading, setLoading] = useState(true)
  const [processando, setProcessando] = useState<number | null>(null)
  const [cadastrar, setCadastrar] = useState<Pendente | null>(null)
  const [tipo, setTipo] = useState('Visitante')
  const [vincular, setVincular] = useState<Pendente | null>(null)
  const [escolhido, setEscolhido] = useState<PessoaEscolhida | null>(null)

  const carregar = useCallback(async () => {
    if (!token || !temAcesso) return
    setLoading(true)
    try {
      const qs = new URLSearchParams({ status })
      if (filtroCongregacao) qs.set('congregacao', String(filtroCongregacao))
      const res = await fetch(`/api/ofertas/pendentes?${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (!res.ok) { toast({ title: json.error || 'Erro ao carregar.', variant: 'destructive' }); return }
      setLista(json)
    } finally {
      setLoading(false)
    }
  }, [token, temAcesso, status, filtroCongregacao, toast])

  useEffect(() => { carregar() }, [carregar])

  const agir = async (p: Pendente, corpo: Record<string, unknown>) => {
    setProcessando(p.id)
    try {
      const res = await fetch(`/api/ofertas/pendentes/${p.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      const json = await res.json()
      if (!res.ok) { toast({ title: json.error, variant: 'destructive' }); return false }
      toast({ title: json.message })
      carregar()
      return true
    } finally {
      setProcessando(null)
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
      </div>
    )
  }

  const varias = new Set(lista.map(p => p.congregacao_id)).size > 1

  return (
    <div className="space-y-6">
      <div>
        <Link href="/ofertas" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-3.5 w-3.5" /> Ofertas
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-2 mt-1"><UserPlus className="h-6 w-6" /> Pendentes de cadastro</h1>
        <p className="text-sm text-muted-foreground">
          Pessoas que ofertaram mas ainda não têm cadastro. Ao cadastrar ou vincular, os lançamentos antigos passam a apontar para a ficha.
        </p>
      </div>

      <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40">
        {STATUS.map(s => (
          <button key={s.id} onClick={() => setStatus(s.id)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${status === s.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : lista.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Ninguém nesta lista.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {lista.map(p => (
            <Card key={p.id}>
              <CardContent className="p-3 sm:p-4 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[12rem]">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <p className="font-semibold">{p.nome}</p>
                    {p.status !== 'pendente' && (
                      <Badge variant="outline" className="text-xs h-5">{p.status === 'cadastrado' ? 'Cadastrado' : 'Descartado'}</Badge>
                    )}
                    {varias && <span className="text-xs text-muted-foreground">{p.congregacao_nome}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                    {p.telefone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{p.telefone}</span>}
                    <span>{p.qtd_lancamentos} lançamento{p.qtd_lancamentos !== 1 ? 's' : ''}</span>
                    {p.ultimo_culto && <span>último culto {formatarData(p.ultimo_culto)}</span>}
                    {p.membro_nome && <span>ficha: {p.membro_nome}</span>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {p.status === 'pendente' && podeCadastrar && (
                    <Button size="sm" onClick={() => { setTipo('Visitante'); setCadastrar(p) }} disabled={processando === p.id}>
                      <UserPlus className="h-3.5 w-3.5" /> Cadastrar
                    </Button>
                  )}
                  {p.status === 'pendente' && podeLancar && (
                    <Button size="sm" variant="outline" onClick={() => { setEscolhido(null); setVincular(p) }} disabled={processando === p.id}>
                      <Link2 className="h-3.5 w-3.5" /> Já tem cadastro
                    </Button>
                  )}
                  {p.status === 'pendente' && podeResolver && (
                    <Button size="sm" variant="ghost" onClick={() => { if (confirm(`Tirar "${p.nome}" da lista sem cadastrar?`)) agir(p, { acao: 'descartar' }) }} disabled={processando === p.id}>
                      <X className="h-3.5 w-3.5" /> Descartar
                    </Button>
                  )}
                  {p.status === 'descartado' && podeResolver && (
                    <Button size="sm" variant="outline" onClick={() => agir(p, { acao: 'reabrir' })} disabled={processando === p.id}>
                      <RotateCcw className="h-3.5 w-3.5" /> Voltar para a lista
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!cadastrar} onOpenChange={o => { if (!o) setCadastrar(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Cadastrar {cadastrar?.nome}</DialogTitle>
            <DialogDescription>
              Cria a ficha com nome{cadastrar?.telefone ? ', telefone' : ''} e congregação. Depois complete os demais dados em Membros.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor="pend-tipo" className="text-sm font-medium">Tipo</label>
            <select id="pend-tipo" value={tipo} onChange={e => setTipo(e.target.value)}
              className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
              <option>Visitante</option>
              <option>Congregado</option>
              <option>Membro</option>
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCadastrar(null)}>Cancelar</Button>
            <Button
              disabled={processando === cadastrar?.id}
              onClick={async () => { if (cadastrar && await agir(cadastrar, { acao: 'cadastrar', tipo_participante: tipo })) setCadastrar(null) }}
            >
              {processando === cadastrar?.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar cadastro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!vincular} onOpenChange={o => { if (!o) setVincular(null) }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Vincular {vincular?.nome}</DialogTitle>
            <DialogDescription>Escolha a ficha que já existe para esta pessoa.</DialogDescription>
          </DialogHeader>
          {vincular && (
            <PessoaPicker
              token={token}
              congregacaoId={vincular.congregacao_id}
              valor={escolhido}
              onChange={p => setEscolhido(p && p.tipo === 'membro' ? p : null)}
            />
          )}
          <p className="text-xs text-muted-foreground">Só fichas cadastradas da mesma congregação podem ser escolhidas.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVincular(null)}>Cancelar</Button>
            <Button
              disabled={!escolhido || processando === vincular?.id}
              onClick={async () => {
                if (vincular && escolhido?.tipo === 'membro' && await agir(vincular, { acao: 'vincular', membro_id: escolhido.id })) setVincular(null)
              }}
            >
              Vincular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
