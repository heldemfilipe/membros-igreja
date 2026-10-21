"use client"

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, X, ChevronDown, ChevronUp, Users } from 'lucide-react'
import { DIAS_SEMANA } from '@/lib/constants'
import {
  TIPOS_OFERTA, TIPO_LABEL, parseValorBR, formatarBRL, centavosParaTexto,
  type TipoOferta, type OfertaItemEntrada,
} from '@/lib/ofertas-shared'
import { cn } from '@/lib/utils'
import type { Culto } from '@/types'
import { PessoaPicker, type PessoaEscolhida } from './PessoaPicker'

export type CongregacaoOferta = { id: number; nome: string; cultos?: Culto[] }

interface Props {
  /** undefined = fechado; null = novo lançamento; número = editar */
  ofertaId: number | null | undefined
  congregacoes: CongregacaoOferta[]
  congregacaoInicial: number | null
  token: string | null
  onClose: () => void
  onSaved: () => void
}

type Linha = { key: number; tipo: TipoOferta; valor: string; pessoa: PessoaEscolhida | null }
type Valores = Record<TipoOferta, string>

const VALORES_VAZIOS: Valores = { dizimos: '', ofertas: '', missoes: '', outros: '' }
let seq = 0
const novaLinha = (tipo: TipoOferta = 'dizimos'): Linha => ({ key: ++seq, tipo, valor: '', pessoa: null })

function hojeLocal(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function diaDaSemana(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).getDay()
}

export function OfertaFormModal({ ofertaId, congregacoes, congregacaoInicial, token, onClose, onSaved }: Props) {
  const { toast } = useToast()
  const aberto = ofertaId !== undefined
  const editando = typeof ofertaId === 'number'

  const [congId, setCongId] = useState<number | null>(null)
  const [data, setData] = useState(hojeLocal())
  const [cultoSel, setCultoSel] = useState<string>('') // id do culto | 'outro'
  const [cultoOutro, setCultoOutro] = useState('')
  const [valores, setValores] = useState<Valores>(VALORES_VAZIOS)
  const [obs, setObs] = useState('')
  const [mostrarDetalhe, setMostrarDetalhe] = useState(false)
  const [linhas, setLinhas] = useState<Linha[]>([])
  // null = o usuário não pode ver o detalhe deste lançamento (fica como está)
  const [detalheVisivel, setDetalheVisivel] = useState(true)
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [cultoManual, setCultoManual] = useState(false)

  const congregacao = congregacoes.find(c => c.id === congId) ?? null
  const cultos = useMemo(() => congregacao?.cultos ?? [], [congregacao])

  // Abre: novo lançamento limpo, ou carrega o existente.
  useEffect(() => {
    if (!aberto) return
    setMostrarDetalhe(false)
    setCultoManual(false)
    if (!editando) {
      setCongId(congregacaoInicial ?? congregacoes[0]?.id ?? null)
      setData(hojeLocal())
      setCultoSel('')
      setCultoOutro('')
      setValores(VALORES_VAZIOS)
      setObs('')
      setLinhas([])
      setDetalheVisivel(true)
      return
    }
    setCarregando(true)
    fetch(`/api/ofertas/${ofertaId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async r => {
        const o = await r.json()
        if (!r.ok) { toast({ title: o.error || 'Erro ao abrir o lançamento.', variant: 'destructive' }); onClose(); return }
        setCongId(o.congregacao_id)
        setData(String(o.data_culto).slice(0, 10))
        setCultoManual(true)
        if (o.culto_id) { setCultoSel(String(o.culto_id)); setCultoOutro('') }
        else { setCultoSel('outro'); setCultoOutro(o.culto_nome) }
        const v = {} as Valores
        for (const t of TIPOS_OFERTA) {
          const c = Math.round(Number(o[t.key]) * 100)
          v[t.key] = c ? centavosParaTexto(c) : ''
        }
        setValores(v)
        setObs(o.observacoes ?? '')
        if (o.itens === null) {
          setDetalheVisivel(false)
          setLinhas([])
        } else {
          setDetalheVisivel(true)
          setLinhas(o.itens.map((it: { tipo: TipoOferta; valor: string; membro_id: number | null; pessoa_pendente_id: number | null; nome: string }) => ({
            key: ++seq,
            tipo: it.tipo,
            valor: centavosParaTexto(Math.round(Number(it.valor) * 100)),
            pessoa: it.membro_id
              ? { tipo: 'membro', id: it.membro_id, nome: it.nome }
              : it.pessoa_pendente_id
                ? { tipo: 'pendente', id: it.pessoa_pendente_id, nome: it.nome }
                : null,
          })))
          setMostrarDetalhe(o.itens.length > 0)
        }
      })
      .finally(() => setCarregando(false))
  }, [aberto, editando, ofertaId, token, congregacaoInicial, congregacoes, toast, onClose])

  // Sugere o culto do dia da semana da data escolhida (até o usuário escolher outro).
  useEffect(() => {
    if (!aberto || cultoManual) return
    const doDia = cultos.filter(c => c.dia_semana === diaDaSemana(data))
    setCultoSel(doDia[0]?.id ? String(doDia[0].id) : cultos.length ? '' : 'outro')
  }, [aberto, cultoManual, cultos, data])

  const centavos = (t: TipoOferta) => parseValorBR(valores[t])
  const total = TIPOS_OFERTA.reduce((s, t) => s + (centavos(t.key) ?? 0), 0)
  const detalhadoPorTipo = (t: TipoOferta) =>
    linhas.filter(l => l.tipo === t).reduce((s, l) => s + (parseValorBR(l.valor) ?? 0), 0)

  const salvar = async () => {
    if (!congId) { toast({ title: 'Escolha a congregação.', variant: 'destructive' }); return }
    const valoresC = {} as Record<TipoOferta, number>
    for (const t of TIPOS_OFERTA) {
      const c = centavos(t.key)
      if (c == null) { toast({ title: `${t.label}: valor inválido.`, variant: 'destructive' }); return }
      valoresC[t.key] = c
    }

    const itens: OfertaItemEntrada[] = []
    for (const [i, l] of linhas.entries()) {
      const v = parseValorBR(l.valor)
      if (!l.pessoa && !v) continue // linha vazia é ignorada
      if (!l.pessoa) { toast({ title: `Detalhe ${i + 1}: escolha a pessoa.`, variant: 'destructive' }); return }
      if (!v) { toast({ title: `Detalhe ${i + 1}: informe o valor.`, variant: 'destructive' }); return }
      itens.push({
        tipo: l.tipo,
        valor: v,
        membro_id: l.pessoa.tipo === 'membro' ? l.pessoa.id : null,
        pessoa_pendente_id: l.pessoa.tipo === 'pendente' ? l.pessoa.id : null,
        nova_pessoa: l.pessoa.tipo === 'nova' ? { nome: l.pessoa.nome, telefone: l.pessoa.telefone || null } : null,
      })
    }

    setSalvando(true)
    try {
      const res = await fetch(editando ? `/api/ofertas/${ofertaId}` : '/api/ofertas', {
        method: editando ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          congregacao_id: congId,
          data_culto: data,
          culto_id: cultoSel && cultoSel !== 'outro' ? Number(cultoSel) : null,
          culto_nome: cultoSel === 'outro' ? cultoOutro : null,
          valores: valoresC,
          observacoes: obs,
          itens,
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast({ title: json.error || 'Erro ao salvar.', variant: 'destructive' }); return }
      toast({ title: json.message })
      onSaved()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={o => { if (!o && !salvando) onClose() }}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editando ? 'Corrigir lançamento' : 'Lançar oferta do culto'}</DialogTitle>
          <DialogDescription>
            O total por tipo é obrigatório. Detalhar por pessoa é opcional.
          </DialogDescription>
        </DialogHeader>

        {carregando ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {congregacoes.length > 1 && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="of-cong">Congregação</Label>
                  <select
                    id="of-cong"
                    value={congId ?? ''}
                    onChange={e => { setCongId(Number(e.target.value)); setCultoManual(false); setLinhas([]) }}
                    disabled={editando}
                    className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {congregacoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="of-data">Data do culto</Label>
                <Input id="of-data" type="date" value={data} max={hojeLocal()} onChange={e => setData(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="of-culto">Culto</Label>
                <select
                  id="of-culto"
                  value={cultoSel}
                  onChange={e => { setCultoSel(e.target.value); setCultoManual(true) }}
                  className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="" disabled>Selecione...</option>
                  {cultos.map(c => (
                    <option key={c.id} value={c.id}>{DIAS_SEMANA[c.dia_semana]} {c.horario} — {c.nome}</option>
                  ))}
                  <option value="outro">Outro (culto extra)</option>
                </select>
              </div>
              {cultoSel === 'outro' && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="of-culto-outro">Nome do culto</Label>
                  <Input id="of-culto-outro" value={cultoOutro} onChange={e => setCultoOutro(e.target.value)}
                    placeholder="Ex.: Culto de Santa Ceia, Vigília" maxLength={80} />
                </div>
              )}
            </div>

            <div className="rounded-lg border p-3 space-y-2.5">
              {TIPOS_OFERTA.map(t => {
                const invalido = centavos(t.key) == null
                return (
                  <div key={t.key} className="flex items-center gap-3">
                    <Label htmlFor={`of-${t.key}`} className="w-24 shrink-0">{t.label}</Label>
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                      <Input
                        id={`of-${t.key}`}
                        inputMode="decimal"
                        value={valores[t.key]}
                        onChange={e => setValores(v => ({ ...v, [t.key]: e.target.value }))}
                        placeholder="0,00"
                        className={cn('pl-9 text-right tabular-nums', invalido && 'border-destructive')}
                      />
                    </div>
                  </div>
                )
              })}
              <div className="flex items-center justify-between border-t pt-2.5 text-sm">
                <span className="font-medium">Total</span>
                <span className="font-bold tabular-nums text-base">{formatarBRL(total / 100)}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="of-obs">Observação</Label>
              <Textarea id="of-obs" value={obs} onChange={e => setObs(e.target.value)} maxLength={500} className="min-h-[60px]" />
            </div>

            {detalheVisivel ? (
              <div className="rounded-lg border">
                <button
                  type="button"
                  onClick={() => { setMostrarDetalhe(m => !m); if (!linhas.length) setLinhas([novaLinha()]) }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium hover:bg-accent/40"
                >
                  <Users className="h-4 w-4 text-primary" />
                  <span className="flex-1 text-left">Detalhar por pessoa (opcional)</span>
                  {linhas.some(l => l.pessoa) && (
                    <span className="text-xs text-muted-foreground">{linhas.filter(l => l.pessoa).length} pessoa(s)</span>
                  )}
                  {mostrarDetalhe ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {mostrarDetalhe && congId && (
                  <div className="border-t p-3 space-y-3">
                    {linhas.map((l, i) => (
                      <div key={l.key} className="grid grid-cols-[6.5rem_1fr_6.5rem_2rem] gap-2 items-start">
                        <select
                          value={l.tipo}
                          onChange={e => setLinhas(ls => ls.map(x => x.key === l.key ? { ...x, tipo: e.target.value as TipoOferta } : x))}
                          aria-label={`Tipo do detalhe ${i + 1}`}
                          className="h-9 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {TIPOS_OFERTA.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
                        </select>
                        <PessoaPicker
                          token={token}
                          congregacaoId={congId}
                          valor={l.pessoa}
                          onChange={p => setLinhas(ls => ls.map(x => x.key === l.key ? { ...x, pessoa: p } : x))}
                        />
                        <Input
                          inputMode="decimal"
                          value={l.valor}
                          onChange={e => setLinhas(ls => ls.map(x => x.key === l.key ? { ...x, valor: e.target.value } : x))}
                          placeholder="0,00"
                          aria-label={`Valor do detalhe ${i + 1}`}
                          className={cn('h-9 text-right tabular-nums', parseValorBR(l.valor) == null && 'border-destructive')}
                        />
                        <button
                          type="button"
                          onClick={() => setLinhas(ls => ls.filter(x => x.key !== l.key))}
                          className="h-9 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          aria-label={`Remover detalhe ${i + 1}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => setLinhas(ls => [...ls, novaLinha(ls[ls.length - 1]?.tipo)])}>
                      <Plus className="h-3.5 w-3.5" /> Adicionar pessoa
                    </Button>

                    <div className="rounded-md bg-muted/30 p-2.5 text-xs space-y-1">
                      {TIPOS_OFERTA.map(t => {
                        const tot = centavos(t.key) ?? 0
                        const det = detalhadoPorTipo(t.key)
                        if (!tot && !det) return null
                        const passou = det > tot
                        return (
                          <p key={t.key} className={cn('tabular-nums', passou && 'text-destructive font-medium')}>
                            {TIPO_LABEL[t.key]}: {formatarBRL(det / 100)} detalhados de {formatarBRL(tot / 100)}
                            {passou ? ' — passou do total!' : det < tot ? ` · ${formatarBRL((tot - det) / 100)} não identificados` : ''}
                          </p>
                        )
                      })}
                      <p className="text-muted-foreground pt-1">
                        Quem não tem cadastro entra na lista de pendentes para ser cadastrado depois.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground rounded-lg border p-3">
                Este lançamento pode ter detalhe por pessoa, que você não tem permissão de ver. Ele será mantido como está.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={salvando}>Cancelar</Button>
          <Button onClick={salvar} disabled={salvando || carregando}>
            {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {editando ? 'Salvar correção' : 'Salvar lançamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
