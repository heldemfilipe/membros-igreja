"use client"

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, DoorOpen, MessageCircle, Phone, Church, CalendarDays,
  Search, UserPlus, CheckCircle2,
} from 'lucide-react'
import { formatarData } from '@/lib/utils'
import type { VisitanteRecepcao } from '@/types'

function hoje(): string {
  return new Date().toISOString().split('T')[0]
}
function numeroWhatsApp(tel?: string | null): string {
  const d = (tel || '').replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('55') && d.length >= 12 && d.length <= 13) return d
  if (d.length === 10 || d.length === 11) return '55' + d
  return ''
}
function dataBR(iso: string): string {
  const [y, m, dd] = iso.split('-')
  return dd && m && y ? `${dd}/${m}/${y}` : iso
}

// ─── Toggle "chip" ───────────────────────────────────────────────────────────
function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
        on
          ? 'bg-emerald-600 border-emerald-600 text-white'
          : 'bg-background border-input text-muted-foreground hover:bg-accent'
      }`}
    >
      {on ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span className="w-3.5 h-3.5 rounded-full border border-current inline-block" />}
      {children}
    </button>
  )
}

function RecepcaoInner() {
  const { token, filtroCongregacao, filtroCongregacaoNome, congregacoesAcesso } = useAuth()
  const { toast } = useToast()

  const [congs, setCongs] = useState<{ id: number; nome: string }[]>([])
  const [lista, setLista] = useState<VisitanteRecepcao[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  const [form, setForm] = useState({
    nome: '', congregacao_nome: '', telefone: '', data_visita: hoje(), obs: '',
  })
  const [saving, setSaving] = useState(false)
  const [aviso, setAviso] = useState<{ texto: string; numero: string; dirigente: string } | null>(null)

  const carregar = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const qs = filtroCongregacao ? `?congregacao=${filtroCongregacao}` : ''
      const res = await fetch(`/api/recepcao/visitantes${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setLista(await res.json())
    } finally {
      setLoading(false)
    }
  }, [token, filtroCongregacao])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    if (!token) return
    fetch('/api/congregacoes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then((data: { id: number; nome: string }[]) => {
        const l = data || []
        setCongs(l)
        setForm(f => {
          if (f.congregacao_nome) return f
          if (filtroCongregacaoNome) return { ...f, congregacao_nome: filtroCongregacaoNome }
          if (congregacoesAcesso?.length === 1) {
            const nome = l.find(c => c.id === congregacoesAcesso[0])?.nome
            if (nome) return { ...f, congregacao_nome: nome }
          }
          if (l.length === 1) return { ...f, congregacao_nome: l[0].nome }
          return f
        })
      })
      .catch(() => {})
  }, [token, filtroCongregacaoNome, congregacoesAcesso])

  const congTravada = filtroCongregacaoNome || (congs.length === 1 ? congs[0].nome : null)

  const registrar = async () => {
    if (!form.nome.trim()) { toast({ title: 'Informe o nome do visitante.', variant: 'destructive' }); return }
    const cong = congTravada || form.congregacao_nome
    if (!cong) { toast({ title: 'Selecione a congregação.', variant: 'destructive' }); return }

    setSaving(true)
    try {
      const res = await fetch('/api/recepcao/visitante', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          congregacao_nome: cong,
          telefone_principal: form.telefone.trim(),
          data_visita: form.data_visita || hoje(),
          observacoes: form.obs.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast({ title: data.error || 'Erro ao registrar.', variant: 'destructive' }); return }

      const numero = numeroWhatsApp(data.dirigente?.telefone)
      if (numero) {
        const texto =
          `🙋 *Novo visitante* — ${cong}\n\n` +
          `Nome: ${form.nome.trim()}\n` +
          `Telefone: ${form.telefone.trim() || '—'}\n` +
          `Data da visita: ${dataBR(form.data_visita || hoje())}\n` +
          `Como conheceu / obs.: ${form.obs.trim() || '—'}`
        setAviso({ texto, numero, dirigente: data.dirigente?.nome || 'o dirigente' })
      } else {
        toast({ title: '✓ Visitante registrado!' })
      }
      setForm(f => ({ ...f, nome: '', telefone: '', obs: '' }))
      carregar()
    } finally {
      setSaving(false)
    }
  }

  const salvarAcomp = async (membroId: number, patch: Partial<VisitanteRecepcao>) => {
    const atual = lista.find(v => v.membro_id === membroId)
    if (!atual) return
    const merged = { ...atual, ...patch }
    setLista(prev => prev.map(v => v.membro_id === membroId ? merged : v))
    try {
      const res = await fetch('/api/recepcao/acompanhamento', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          membro_id: membroId,
          voltou_culto: merged.voltou_culto,
          visita_casa_data: merged.visita_casa_data,
          visita_casa_feita: merged.visita_casa_feita,
          discipulado: merged.discipulado,
          discipulador: merged.discipulador,
          observacoes: merged.observacoes,
        }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast({ title: 'Erro ao salvar. Recarregando…', variant: 'destructive' })
      carregar()
    }
  }

  const filtrados = busca.trim()
    ? lista.filter(v => v.nome.toLowerCase().includes(busca.trim().toLowerCase()))
    : lista

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DoorOpen className="h-6 w-6" />
          Recepção
        </h1>
        <p className="text-sm text-muted-foreground">Cadastro rápido de visitantes e acompanhamento</p>
      </div>

      {/* ─── Cadastro rápido ──────────────────────────────────────────────── */}
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" />Novo visitante</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {aviso ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" /> Visitante registrado!
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap text-muted-foreground">
                {aviso.texto}
              </div>
              <div className="flex gap-2">
                <a
                  href={`https://wa.me/${aviso.numero}?text=${encodeURIComponent(aviso.texto)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setAviso(null)}
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Avisar {aviso.dirigente} no WhatsApp
                </a>
                <Button variant="outline" onClick={() => setAviso(null)}>Fechar</Button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Nome *</Label>
                  <Input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} placeholder="Nome do visitante" autoFocus />
                </div>
                <div className="space-y-1">
                  <Label>Congregação *</Label>
                  {congTravada ? (
                    <div className="h-10 px-3 rounded-md border border-input bg-muted flex items-center text-sm font-medium">{congTravada}</div>
                  ) : (
                    <select
                      value={form.congregacao_nome}
                      onChange={e => setForm(f => ({ ...f, congregacao_nome: e.target.value }))}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Selecione...</option>
                      {congs.map(c => <option key={c.id} value={c.nome}>{c.nome}</option>)}
                    </select>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Telefone</Label>
                  <Input type="tel" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
                </div>
                <div className="space-y-1">
                  <Label>Data da visita</Label>
                  <div className="flex gap-2">
                    <Input type="date" value={form.data_visita} onChange={e => setForm(f => ({ ...f, data_visita: e.target.value }))} className="flex-1" />
                    <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => setForm(f => ({ ...f, data_visita: hoje() }))}>
                      <CalendarDays className="h-3.5 w-3.5" />Hoje
                    </Button>
                  </div>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Como conheceu / observações</Label>
                  <Input value={form.obs} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} placeholder="Indicação, evento, rede social..." />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={registrar} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Registrar visitante
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ─── Busca ────────────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar visitante..."
          className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* ─── Lista de visitantes ─────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : filtrados.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">Nenhum visitante encontrado.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{filtrados.length} visitante{filtrados.length !== 1 ? 's' : ''}</p>
          {filtrados.map(v => (
            <Card key={v.membro_id} className="border-l-4 border-l-amber-500">
              <CardContent className="p-3 sm:p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 flex items-center justify-center text-xs font-bold select-none">
                    {v.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm leading-tight">{v.nome}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-xs text-muted-foreground">
                      {v.telefone_principal && (
                        <a href={`tel:${v.telefone_principal}`} className="flex items-center gap-1 hover:text-primary">
                          <Phone className="h-3 w-3" />{v.telefone_principal}
                        </a>
                      )}
                      {!filtroCongregacao && v.igreja && (
                        <span className="flex items-center gap-1"><Church className="h-3 w-3" />{v.igreja}</span>
                      )}
                      <span>
                        {v.total_visitas} visita{v.total_visitas !== 1 ? 's' : ''}
                        {v.ultima_visita ? ` · última ${formatarData(v.ultima_visita)}` : ''}
                      </span>
                    </div>
                  </div>
                  {v.total_visitas >= 3 && (
                    <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700">
                      frequente
                    </Badge>
                  )}
                </div>

                {/* Checklist */}
                <div className="flex flex-wrap items-center gap-2 pl-12">
                  <Chip on={v.voltou_culto} onClick={() => salvarAcomp(v.membro_id, { voltou_culto: !v.voltou_culto })}>
                    Voltou no culto
                  </Chip>

                  <Chip on={v.visita_casa_feita} onClick={() => salvarAcomp(v.membro_id, { visita_casa_feita: !v.visita_casa_feita })}>
                    Visita na casa
                  </Chip>
                  <input
                    type="date"
                    value={v.visita_casa_data ? v.visita_casa_data.split('T')[0] : ''}
                    onChange={e => salvarAcomp(v.membro_id, { visita_casa_data: e.target.value || null })}
                    title="Data da visita na casa"
                    className="h-7 px-2 rounded-md border border-input bg-background text-xs"
                  />

                  <Chip on={v.discipulado} onClick={() => salvarAcomp(v.membro_id, { discipulado: !v.discipulado })}>
                    Discipulado
                  </Chip>
                  <input
                    type="text"
                    defaultValue={v.discipulador ?? ''}
                    onBlur={e => {
                      const val = e.target.value.trim() || null
                      if (val !== (v.discipulador ?? null)) salvarAcomp(v.membro_id, { discipulador: val })
                    }}
                    placeholder="quem vai discipular"
                    className="h-7 px-2 rounded-md border border-input bg-background text-xs w-40"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default function RecepcaoPage() {
  return (
    <RequirePermission perm="recepcao">
      <RecepcaoInner />
    </RequirePermission>
  )
}
