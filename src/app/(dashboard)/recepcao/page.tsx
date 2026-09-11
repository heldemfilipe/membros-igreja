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
  Search, UserPlus, Trash2, Pencil, Send, MessageSquareText,
  Inbox, ChevronDown, ChevronUp, Check, X,
} from 'lucide-react'
import { formatarData, numeroWhatsApp, calcularIdade } from '@/lib/utils'
import { AvisoDirigente, type AvisoDados } from '@/components/recepcao/AvisoDirigente'
import { AcompanhamentoModal, type VisitanteEdicao } from '@/components/recepcao/AcompanhamentoModal'
import { EnviarMensagemModal, type AlvoMensagem } from '@/components/recepcao/EnviarMensagemModal'
import { FrasesProntas } from '@/components/recepcao/FrasesProntas'
import type { VisitanteRecepcao, Acompanhamento, CadastroPublico, Culto } from '@/types'

const LABELS_CADASTRO_PUBLICO: Record<string, string> = {
  email: 'E-mail',
  data_nascimento: 'Nascimento',
  endereco: 'Endereço',
  data_casamento: 'Data de casamento',
  estado_civil: 'Estado civil',
  grau_instrucao: 'Formação escolar',
  profissao: 'Área de atuação',
  dons_talentos: 'Dons e talentos',
  dons_desejados: 'Gostaria de aprender',
  batizado_espirito_santo: 'Batizado com Espírito Santo',
  batizado_aguas: 'Batizado nas águas',
  vida_ministerial: 'Vida ministerial',
  origem_religiosa: 'Religião anterior',
  origem_religiosa_detalhe: 'Qual religião',
  desafios_pessoais: 'Espaço pessoal',
  convidado_por: 'Convidado por',
  informacoes_complementares: 'Observações',
}

function camposCadastroPublico(dados: CadastroPublico['dados']): { label: string; valor: string }[] {
  return Object.entries(dados)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => ({
      label: LABELS_CADASTRO_PUBLICO[k] || k,
      valor: typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : String(v),
    }))
}

function hoje(): string {
  return new Date().toISOString().split('T')[0]
}
function dataBR(iso: string): string {
  const [y, m, dd] = iso.split('-')
  return dd && m && y ? `${dd}/${m}/${y}` : iso
}

function statusTags(v: VisitanteRecepcao): string[] {
  return [
    v.contato_feito && 'Contato feito',
    v.visita_agendada && 'Visita marcada',
    v.visita_casa_feita && 'Visita realizada',
    v.voltou_culto && 'Voltou ao culto',
    v.discipulado && 'Discipulado',
    v.batizado && 'Batizado',
  ].filter(Boolean) as string[]
}

function RecepcaoInner() {
  const { token, filtroCongregacao, filtroCongregacaoNome, congregacoesAcesso } = useAuth()
  const { toast } = useToast()

  type Cong = {
    id: number
    nome: string
    nome_oficial?: string | null
    notificar_whatsapp?: boolean
    dirigente_nome?: string | null
    dirigente_telefone_efetivo?: string | null
    cultos?: Culto[]
  }
  const [congs, setCongs] = useState<Cong[]>([])
  const [lista, setLista] = useState<VisitanteRecepcao[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')

  const [form, setForm] = useState({
    nome: '', congregacao_nome: '', telefone: '', data_visita: hoje(), obs: '',
  })
  const [saving, setSaving] = useState(false)
  const [aviso, setAviso] = useState<AvisoDados | null>(null)
  const [editando, setEditando] = useState<VisitanteRecepcao | null>(null)
  const [enviando, setEnviando] = useState<AlvoMensagem | null>(null)
  const [frasesOpen, setFrasesOpen] = useState(false)
  const [pendentes, setPendentes] = useState<CadastroPublico[]>([])
  const [expandidoPendente, setExpandidoPendente] = useState<number | null>(null)
  const [processandoPendente, setProcessandoPendente] = useState<number | null>(null)

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

  const carregarPendentes = useCallback(async () => {
    if (!token) return
    try {
      const res = await fetch('/api/cadastros-publicos?status=pendente', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setPendentes(await res.json())
    } catch { /* ignore */ }
  }, [token])

  useEffect(() => { carregarPendentes() }, [carregarPendentes])

  const revisarPendente = async (id: number, acao: 'aprovar' | 'rejeitar') => {
    setProcessandoPendente(id)
    try {
      const res = await fetch(`/api/cadastros-publicos/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao }),
      })
      const data = await res.json()
      if (!res.ok) { toast({ title: data.error || 'Erro ao revisar cadastro.', variant: 'destructive' }); return }
      setPendentes(prev => prev.filter(p => p.id !== id))
      toast({ title: acao === 'aprovar' ? '✓ Cadastro aprovado!' : 'Cadastro rejeitado.' })
      if (acao === 'aprovar') carregar()
    } finally {
      setProcessandoPendente(null)
    }
  }

  useEffect(() => {
    if (!token) return
    fetch('/api/congregacoes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then((data: Cong[]) => {
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

    // Se a congregação avisa por WhatsApp, já abre uma aba em branco AGORA
    // (dentro do clique) para não ser bloqueada pelo navegador; depois do
    // cadastro, mandamos ela para o wa.me.
    const congObj = congs.find(c => c.nome === cong)
    const vaiAvisar = congObj?.notificar_whatsapp !== false && !!numeroWhatsApp(congObj?.dirigente_telefone_efetivo)
    const janela = vaiAvisar ? window.open('about:blank', '_blank') : null

    const nome = form.nome.trim()
    const obs = form.obs.trim()

    setSaving(true)
    try {
      const res = await fetch('/api/recepcao/visitante', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome,
          congregacao_nome: cong,
          telefone_principal: form.telefone.trim(),
          data_visita: form.data_visita || hoje(),
          observacoes: obs,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        janela?.close()
        toast({ title: data.error || 'Erro ao registrar.', variant: 'destructive' })
        return
      }

      toast({ title: '✓ Visitante registrado!' })
      const numero = numeroWhatsApp(data.dirigente?.telefone)
      if (numero) {
        const texto = `Novo visitante — ${cong}\n\nNome: ${nome}\nObservações: ${obs || '—'}`
        const url = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
        if (janela) {
          janela.location.href = url
        } else {
          // aba foi bloqueada — abre o diálogo com o botão manual
          setAviso({
            numero,
            dirigenteNome: data.dirigente?.nome || null,
            congregacao: cong,
            campos: [
              { key: 'nome', label: 'Nome', valor: nome },
              { key: 'telefone', label: 'Telefone', valor: form.telefone.trim() },
              { key: 'data_visita', label: 'Data da visita', valor: dataBR(form.data_visita || hoje()) },
              { key: 'observacoes', label: 'Observações', valor: obs },
            ],
          })
        }
      } else {
        janela?.close()
      }
      setForm(f => ({ ...f, nome: '', telefone: '', obs: '' }))
      carregar()
    } finally {
      setSaving(false)
    }
  }

  const salvarAcomp = async (membroId: number, patch: Partial<Acompanhamento>) => {
    const atual = lista.find(v => v.membro_id === membroId)
    if (!atual) return
    const merged = { ...atual, ...patch }
    setLista(prev => prev.map(v => v.membro_id === membroId ? merged : v))
    const campos: (keyof Acompanhamento)[] = [
      'contato_feito', 'contato_por', 'contato_data',
      'visita_agendada', 'visita_agendada_por', 'visita_casa_data', 'visita_casa_feita',
      'voltou_culto', 'voltou_culto_data',
      'discipulado', 'discipulado_inicio', 'discipulador',
      'batizado', 'congregacao_origem', 'observacoes',
    ]
    const body: Record<string, unknown> = { membro_id: membroId }
    campos.forEach(k => { body[k] = merged[k] })
    try {
      const res = await fetch('/api/recepcao/acompanhamento', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast({ title: 'Erro ao salvar. Recarregando…', variant: 'destructive' })
      carregar()
    }
  }

  const salvarVisitante = async (membroId: number, dados: VisitanteEdicao) => {
    try {
      const res = await fetch(`/api/recepcao/visitante/${membroId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: dados.nome,
          telefone_principal: dados.telefone_principal,
          email: dados.email,
          data_nascimento: dados.data_nascimento,
          informacoes_complementares: dados.informacoes_complementares,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error)
      }
    } catch (e) {
      toast({ title: e instanceof Error && e.message ? e.message : 'Erro ao salvar os dados.', variant: 'destructive' })
      carregar()
      return
    }
    // optimistic da lista (todos os campos) + PUT do acompanhamento
    await salvarAcomp(membroId, dados)
    toast({ title: 'Visitante atualizado.' })
  }

  const removerVisitante = async (membroId: number, nome: string) => {
    if (!confirm(`Remover o visitante "${nome}"?\n\nApaga o registro e o histórico de visitas dele.`)) return
    setLista(prev => prev.filter(v => v.membro_id !== membroId))
    try {
      const res = await fetch(`/api/recepcao/visitante/${membroId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Visitante removido.' })
    } catch {
      toast({ title: 'Erro ao remover. Recarregando…', variant: 'destructive' })
      carregar()
    }
  }

  /** Número do dirigente da congregação do visitante — '' se não dá para avisar. */
  const numeroDirigente = (v: VisitanteRecepcao): string => {
    const cong = congs.find(c => c.nome === v.igreja)
    if (cong?.notificar_whatsapp === false) return ''
    return numeroWhatsApp(cong?.dirigente_telefone_efetivo)
  }

  const abrirAviso = (v: VisitanteRecepcao) => {
    const numero = numeroDirigente(v)
    if (!numero) return
    const cong = congs.find(c => c.nome === v.igreja)
    setAviso({
      numero,
      dirigenteNome: cong?.dirigente_nome || null,
      congregacao: v.igreja,
      campos: [
        { key: 'nome', label: 'Nome', valor: v.nome },
        { key: 'telefone', label: 'Telefone', valor: v.telefone_principal || '' },
        { key: 'visitas', label: 'Visitas', valor: `${v.total_visitas}${v.ultima_visita ? ` · última ${formatarData(v.ultima_visita)}` : ''}` },
        { key: 'voltou', label: 'Voltou no culto', valor: v.voltou_culto ? (v.voltou_culto_data ? formatarData(v.voltou_culto_data) : 'sim') : 'não' },
        { key: 'discipulado', label: 'Discipulado', valor: v.discipulado ? (v.discipulador || 'sim') : 'não' },
        { key: 'observacoes', label: 'Observações', valor: v.observacoes || '' },
      ],
    })
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
        </CardContent>
      </Card>

      {/* ─── Cadastros públicos pendentes ────────────────────────────────── */}
      {pendentes.length > 0 && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Cadastros públicos pendentes
              <Badge variant="outline" className="ml-1">{pendentes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendentes.map(p => {
              const aberto = expandidoPendente === p.id
              const campos = camposCadastroPublico(p.dados)
              return (
                <div key={p.id} className="rounded-lg border">
                  <button
                    type="button"
                    onClick={() => setExpandidoPendente(aberto ? null : p.id)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{p.nome}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                        {p.congregacao_nome && <span className="flex items-center gap-1"><Church className="h-3 w-3" />{p.congregacao_nome}</span>}
                        {p.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.telefone}</span>}
                        <span>{formatarData(p.created_at)}</span>
                      </div>
                    </div>
                    {aberto ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>
                  {aberto && (
                    <div className="border-t p-3 space-y-3">
                      {campos.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                          {campos.map(c => (
                            <div key={c.label}>
                              <span className="text-xs text-muted-foreground block">{c.label}</span>
                              <span className="break-words">{c.valor}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Sem campos extras — só nome e telefone.</p>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm" variant="outline"
                          className="gap-1.5 text-destructive hover:text-destructive"
                          disabled={processandoPendente === p.id}
                          onClick={() => revisarPendente(p.id, 'rejeitar')}
                        >
                          <X className="h-3.5 w-3.5" /> Rejeitar
                        </Button>
                        <Button
                          size="sm" className="gap-1.5"
                          disabled={processandoPendente === p.id}
                          onClick={() => revisarPendente(p.id, 'aprovar')}
                        >
                          {processandoPendente === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Aprovar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* ─── Busca ────────────────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar visitante..."
            className="w-full h-9 pl-9 pr-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={() => setFrasesOpen(true)}>
          <MessageSquareText className="h-3.5 w-3.5" />
          Frases prontas
        </Button>
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
                      {v.data_nascimento && (
                        <span className="flex items-center gap-1">
                          🎂 {formatarData(v.data_nascimento)}
                          {calcularIdade(v.data_nascimento) !== null ? ` (${calcularIdade(v.data_nascimento)}a)` : ''}
                        </span>
                      )}
                      <span>
                        {v.total_visitas} visita{v.total_visitas !== 1 ? 's' : ''}
                        {v.ultima_visita ? ` · última ${formatarData(v.ultima_visita)}` : ''}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {v.total_visitas >= 3 && (
                      <Badge variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700">
                        frequente
                      </Badge>
                    )}
                    {numeroWhatsApp(v.telefone_principal) && (
                      <button
                        onClick={() => {
                          const cong = congs.find(c => c.nome === v.igreja)
                          setEnviando({
                            nome: v.nome, telefone: v.telefone_principal,
                            congregacao: cong?.nome_oficial || cong?.nome || v.igreja || null,
                            cultos: cong?.cultos || [],
                          })
                        }}
                        title="Enviar mensagem ao visitante"
                        className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    )}
                    {numeroDirigente(v) && (
                      <button
                        onClick={() => abrirAviso(v)}
                        title="Avisar dirigente no WhatsApp"
                        className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 transition-colors"
                      >
                        <MessageCircle className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setEditando(v)}
                      title="Acompanhamento"
                      className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removerVisitante(v.membro_id, v.nome)}
                      title="Remover visitante"
                      className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Status do acompanhamento */}
                <div className="flex flex-wrap items-center gap-1.5 pl-12">
                  {statusTags(v).length === 0 ? (
                    <button onClick={() => setEditando(v)} className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                      registrar acompanhamento
                    </button>
                  ) : (
                    statusTags(v).map(t => (
                      <Badge key={t} variant="outline" className="text-[10px] text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700">
                        {t}
                      </Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AvisoDirigente aviso={aviso} onClose={() => setAviso(null)} />
      <AcompanhamentoModal
        visitante={editando}
        onClose={() => setEditando(null)}
        onSalvar={dados => salvarVisitante(editando!.membro_id, dados)}
      />
      <EnviarMensagemModal
        alvo={enviando}
        token={token}
        onClose={() => setEnviando(null)}
        onGerenciar={() => { setEnviando(null); setFrasesOpen(true) }}
      />
      <FrasesProntas open={frasesOpen} token={token} onClose={() => setFrasesOpen(false)} />
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
