"use client"

import { useEffect, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, Plus, X } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { descreverFaixa, MAX_FAIXAS, type FaixaEtaria } from '@/lib/faixas-shared'

/** `id: null` = padrão geral (só admin edita). */
export type AlvoFaixas = { id: number | null; nome: string }

interface Props {
  alvo: AlvoFaixas | null
  token: string | null
  podeEditar: boolean
  onClose: () => void
}

type Linha = { nome: string; min: string }

interface Resumo {
  padrao: FaixaEtaria[]
  congregacoes: { id: number; nome: string; personalizada: boolean; faixas: FaixaEtaria[] }[]
}

const auth = (token: string | null) => ({ Authorization: `Bearer ${token}` })

/** Mostra "12–17 anos" a partir das linhas em edição (a última não tem limite). */
function rotulos(linhas: Linha[]): string[] {
  return linhas.map((l, i) => {
    const min = Number(l.min)
    if (l.min === '' || !Number.isFinite(min)) return '—'
    const prox = linhas[i + 1] ? Number(linhas[i + 1].min) : null
    if (prox == null) return `${min}+ anos`
    return Number.isFinite(prox) && prox > min ? `${min}–${prox - 1} anos` : '—'
  })
}

export function FaixasModal({ alvo, token, podeEditar, onClose }: Props) {
  const { toast } = useToast()
  const global = alvo?.id === null
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [padrao, setPadrao] = useState<FaixaEtaria[]>([])
  const [personalizada, setPersonalizada] = useState(false)
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const carregar = useCallback(async () => {
    if (!alvo) return
    setLoading(true)
    try {
      const qs = alvo.id != null ? `?congregacao=${alvo.id}` : ''
      const res = await fetch(`/api/faixas-etarias${qs}`, { headers: auth(token) })
      const data = await res.json()
      if (!res.ok) { toast({ title: data.error || 'Erro ao carregar as faixas.', variant: 'destructive' }); return }
      setLinhas((data.faixas as FaixaEtaria[]).map(f => ({ nome: f.nome, min: String(f.min) })))
      setPadrao(data.padrao)
      setPersonalizada(!!data.personalizada)
      if (alvo.id === null) {
        const r = await fetch('/api/faixas-etarias?resumo=1', { headers: auth(token) })
        if (r.ok) setResumo(await r.json())
      } else {
        setResumo(null)
      }
    } finally {
      setLoading(false)
    }
  }, [alvo, token, toast])

  useEffect(() => { carregar() }, [carregar])

  const atualizar = (i: number, campo: keyof Linha, valor: string) =>
    setLinhas(ls => ls.map((l, idx) => (idx === i ? { ...l, [campo]: valor } : l)))

  const adicionar = () => {
    const ultimo = Number(linhas[linhas.length - 1]?.min) || 0
    setLinhas(ls => [...ls, { nome: '', min: String(ultimo + 10) }])
  }

  const salvar = async () => {
    if (!alvo) return
    setSaving(true)
    try {
      const res = await fetch('/api/faixas-etarias', {
        method: 'PUT',
        headers: { ...auth(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          congregacao_id: alvo.id,
          faixas: linhas.map(l => ({ nome: l.nome, min: Number(l.min) })),
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast({ title: data.error || 'Erro ao salvar.', variant: 'destructive' }); return }
      toast({ title: data.message })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const voltarAoPadrao = async (congId: number, nome: string) => {
    if (!confirm(`Fazer "${nome}" voltar a usar o padrão geral de faixas etárias?`)) return
    const res = await fetch(`/api/faixas-etarias?congregacao=${congId}`, { method: 'DELETE', headers: auth(token) })
    const data = await res.json()
    if (!res.ok) { toast({ title: data.error || 'Erro.', variant: 'destructive' }); return }
    toast({ title: data.message })
    if (alvo?.id === congId) onClose()
    else carregar()
  }

  const rot = rotulos(linhas)
  const proprias = resumo?.congregacoes.filter(c => c.personalizada) ?? []

  return (
    <Dialog open={!!alvo} onOpenChange={o => { if (!o && !saving) onClose() }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Faixas etárias — {global ? 'padrão geral' : alvo?.nome}</DialogTitle>
          <DialogDescription>
            {global
              ? 'Usado por todas as congregações que não personalizaram as suas.'
              : personalizada
                ? 'Esta congregação usa faixas próprias.'
                : 'Esta congregação usa o padrão geral. Ao salvar, passa a ter faixas próprias.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_5.5rem_6.5rem_2rem] gap-2 text-xs text-muted-foreground px-0.5">
                <span>Nome</span><span>A partir de</span><span>Vai de</span><span />
              </div>
              {linhas.map((l, i) => (
                <div key={i} className="grid grid-cols-[1fr_5.5rem_6.5rem_2rem] gap-2 items-center">
                  <Input
                    value={l.nome}
                    onChange={e => atualizar(i, 'nome', e.target.value)}
                    maxLength={30}
                    disabled={!podeEditar}
                    aria-label={`Nome da faixa ${i + 1}`}
                    className="h-9"
                  />
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={l.min}
                    onChange={e => atualizar(i, 'min', e.target.value)}
                    disabled={!podeEditar || i === 0}
                    aria-label={`Idade inicial da faixa ${i + 1}`}
                    className="h-9"
                  />
                  <span className="text-sm tabular-nums text-muted-foreground">{rot[i]}</span>
                  {podeEditar && i > 0 ? (
                    <button
                      type="button"
                      onClick={() => setLinhas(ls => ls.filter((_, idx) => idx !== i))}
                      className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label={`Remover faixa ${i + 1}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : <span />}
                </div>
              ))}
              {podeEditar && linhas.length < MAX_FAIXAS && (
                <Button type="button" variant="outline" size="sm" onClick={adicionar}>
                  <Plus className="h-3.5 w-3.5" /> Adicionar faixa
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Informe só a idade em que cada faixa começa; o fim é calculado pela faixa seguinte, então não
                há buracos nem sobreposição. A última faixa vai até a idade máxima.
              </p>
            </div>

            {!global && (
              <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-1.5">
                <p className="font-medium">Padrão geral sugerido</p>
                <p className="text-muted-foreground">
                  {padrao.map(f => `${f.nome} ${descreverFaixa(f)}`).join(' · ')}
                </p>
                {podeEditar && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button
                      type="button" variant="outline" size="sm"
                      onClick={() => setLinhas(padrao.map(f => ({ nome: f.nome, min: String(f.min) })))}
                    >
                      Copiar para editar
                    </Button>
                    {personalizada && alvo?.id != null && (
                      <Button type="button" variant="outline" size="sm" onClick={() => voltarAoPadrao(alvo.id!, alvo.nome)}>
                        Voltar ao padrão geral
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}

            {global && resumo && (
              <div className="rounded-lg border bg-muted/20 p-3 text-xs space-y-2">
                <p className="font-medium">Congregações com faixas próprias ({proprias.length})</p>
                {proprias.length === 0 ? (
                  <p className="text-muted-foreground">Todas usam o padrão geral.</p>
                ) : (
                  <ul className="space-y-2">
                    {proprias.map(c => (
                      <li key={c.id} className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium">{c.nome}</p>
                          <p className="text-muted-foreground">
                            {c.faixas.map(f => `${f.nome} ${descreverFaixa(f)}`).join(' · ')}
                          </p>
                        </div>
                        <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => voltarAoPadrao(c.id, c.nome)}>
                          Aplicar padrão
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>{podeEditar ? 'Cancelar' : 'Fechar'}</Button>
          {podeEditar && (
            <Button onClick={salvar} disabled={saving || loading}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
