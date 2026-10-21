"use client"

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { OfertaFormModal, type CongregacaoOferta } from '@/components/ofertas/OfertaFormModal'
import { HandCoins, BarChart3, Plus, Loader2, ChevronLeft, ChevronRight, Pencil, Trash2, Users, UserPlus, Lock } from 'lucide-react'
import { TIPOS_OFERTA, formatarBRL } from '@/lib/ofertas-shared'
import { formatarData } from '@/lib/utils'

type Lancamento = {
  id: number
  congregacao_id: number
  congregacao_nome: string
  data_culto: string
  culto_nome: string
  dizimos: string
  ofertas: string
  missoes: string
  outros: string
  total: string
  lancado_por_nome: string | null
  created_at: string
  updated_at: string
  qtd_itens: number
  valor_detalhado: string
  pode_editar: boolean
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

function mesAtual(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function deslocarMes(mes: string, passo: number): string {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 1 + passo, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function OfertasPage() {
  const { token, isAdmin, permissoes, loading: authLoading, filtroCongregacao, temPermissao } = useAuth()
  const { toast } = useToast()
  const flag = (k: string) => isAdmin || permissoes[k] === true
  const podeLancar = flag('ofertas_lancar')
  const podeVer = flag('ofertas_ver')
  const podeEditar = flag('ofertas_editar')
  const podeDetalhe = flag('ofertas_detalhe_ver')
  const temAcesso = podeLancar || podeVer || podeEditar
  const podePendentes = temAcesso || temPermissao('membros_editar')

  const [congregacoes, setCongregacoes] = useState<CongregacaoOferta[]>([])
  const [mes, setMes] = useState(mesAtual)
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [loading, setLoading] = useState(true)
  const [modalId, setModalId] = useState<number | null | undefined>(undefined)

  useEffect(() => {
    if (!token || !temAcesso) return
    fetch('/api/congregacoes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => (r.ok ? r.json() : []))
      .then((d: CongregacaoOferta[]) => setCongregacoes(d || []))
      .catch(() => {})
  }, [token, temAcesso])

  const carregar = useCallback(async () => {
    if (!token || !temAcesso) return
    setLoading(true)
    try {
      const qs = new URLSearchParams({ mes })
      if (filtroCongregacao) qs.set('congregacao', String(filtroCongregacao))
      const res = await fetch(`/api/ofertas?${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      const json = await res.json()
      if (!res.ok) { toast({ title: json.error || 'Erro ao carregar.', variant: 'destructive' }); return }
      setLancamentos(json.lancamentos)
    } finally {
      setLoading(false)
    }
  }, [token, temAcesso, mes, filtroCongregacao, toast])

  useEffect(() => { carregar() }, [carregar])

  const fechar = useCallback(() => setModalId(undefined), [])
  const salvo = useCallback(() => { setModalId(undefined); carregar() }, [carregar])

  const excluir = async (l: Lancamento) => {
    if (!confirm(`Excluir o lançamento de ${formatarData(l.data_culto)} — ${l.culto_nome} (${formatarBRL(l.total)})?\n\nA exclusão fica registrada no histórico.`)) return
    const res = await fetch(`/api/ofertas/${l.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    const json = await res.json()
    if (!res.ok) { toast({ title: json.error, variant: 'destructive' }); return }
    toast({ title: json.message })
    carregar()
  }

  // Memoizado: o modal reinicia o formulário quando esta lista muda de identidade.
  const congsDoModal = useMemo(
    () => (filtroCongregacao ? congregacoes.filter(c => c.id === filtroCongregacao) : congregacoes),
    [congregacoes, filtroCongregacao],
  )

  const somaMes = useMemo(() => {
    const s = { total: 0, dizimos: 0, ofertas: 0, missoes: 0, outros: 0 }
    for (const l of lancamentos) {
      s.total += Number(l.total)
      for (const t of TIPOS_OFERTA) s[t.key] += Number(l[t.key])
    }
    return s
  }, [lancamentos])

  const varias = new Set(lancamentos.map(l => l.congregacao_id)).size > 1 || (!filtroCongregacao && congregacoes.length > 1)
  const [ano, m] = mes.split('-').map(Number)

  if (authLoading) {
    return <div className="flex justify-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }
  if (!temAcesso) {
    return (
      <div className="flex flex-col items-center gap-2 py-24 text-center text-muted-foreground">
        <Lock className="h-8 w-8" />
        <p className="font-medium text-foreground">Acesso restrito</p>
        <p className="text-sm">Ofertas só aparecem para quem o administrador liberar.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><HandCoins className="h-6 w-6" /> Ofertas</h1>
          <p className="text-sm text-muted-foreground">
            {podeVer || podeEditar ? 'Lançamentos' : 'Seus lançamentos'} de {MESES[m - 1]} de {ano}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(podeVer || podeEditar) && (
            <Button variant="outline" asChild>
              <Link href="/ofertas/resumo"><BarChart3 className="h-4 w-4" /> Resumo</Link>
            </Button>
          )}
          {podePendentes && (
            <Button variant="outline" asChild>
              <Link href="/ofertas/pendentes"><UserPlus className="h-4 w-4" /> Pendentes de cadastro</Link>
            </Button>
          )}
          {podeLancar && (
            <Button onClick={() => setModalId(null)} disabled={congsDoModal.length === 0}>
              <Plus className="h-4 w-4" /> Lançar oferta
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Mês anterior" onClick={() => setMes(deslocarMes(mes, -1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={() => setMes(mesAtual())} disabled={mes === mesAtual()}>Mês atual</Button>
        <Button variant="outline" size="icon" className="h-9 w-9" aria-label="Próximo mês" onClick={() => setMes(deslocarMes(mes, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {lancamentos.length > 0 && (
        <Card>
          <CardContent className="p-4 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Total no mês</p>
              <p className="text-2xl font-bold tabular-nums">{formatarBRL(somaMes.total)}</p>
            </div>
            {TIPOS_OFERTA.map(t => somaMes[t.key] > 0 && (
              <div key={t.key}>
                <p className="text-xs text-muted-foreground">{t.label}</p>
                <p className="font-semibold tabular-nums">{formatarBRL(somaMes[t.key])}</p>
              </div>
            ))}
            <p className="text-xs text-muted-foreground w-full">
              {lancamentos.length} lançamento{lancamentos.length !== 1 ? 's' : ''}
              {!podeVer && !podeEditar && ' (somente os que você lançou)'}
            </p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : lancamentos.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Nenhum lançamento neste mês.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {lancamentos.map(l => (
            <Card key={l.id}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2">
                      <p className="font-semibold">{formatarData(l.data_culto)}</p>
                      <p className="text-sm">{l.culto_nome}</p>
                      {varias && <p className="text-xs text-muted-foreground">· {l.congregacao_nome}</p>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 tabular-nums">
                      {TIPOS_OFERTA.filter(t => Number(l[t.key]) > 0).map(t => `${t.label} ${formatarBRL(l[t.key])}`).join(' · ')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Lançado por {l.lancado_por_nome ?? '—'}
                      {l.updated_at !== l.created_at && ' · corrigido'}
                      {l.qtd_itens > 0 && (podeDetalhe || l.pode_editar) && (
                        <span className="inline-flex items-center gap-1 ml-1">
                          · <Users className="h-3 w-3" /> {l.qtd_itens} por pessoa ({formatarBRL(l.valor_detalhado)})
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="font-bold tabular-nums shrink-0">{formatarBRL(l.total)}</p>
                  <div className="flex shrink-0">
                    {l.pode_editar && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" title="Corrigir" onClick={() => setModalId(l.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {podeEditar && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Excluir" onClick={() => excluir(l)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <OfertaFormModal
        ofertaId={modalId}
        congregacoes={congsDoModal}
        congregacaoInicial={filtroCongregacao}
        token={token}
        onClose={fechar}
        onSaved={salvo}
      />
    </div>
  )
}
