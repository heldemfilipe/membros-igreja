"use client"

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import { RequirePermission } from '@/components/auth/RequirePermission'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Loader2, ChevronLeft, ChevronRight, Cake, Heart, HeartHandshake, Megaphone,
  Plus, Trash2, Check, Pencil, CornerDownRight, Printer, Copy, X, MessageCircle,
} from 'lucide-react'
import { numeroWhatsApp } from '@/lib/utils'
import { addDias, hojeISO, rotuloDia, rotuloSemana, segundaFeira } from '@/lib/semana'
import type { PautaAutomatico, PautaItem, PautaSemana, PautaTipo } from '@/types'

type Secao = {
  tipo: PautaTipo
  titulo: string
  icone: typeof Cake
  cor: string
  /** Rótulo do botão de incluir e do campo principal. */
  rotulo: string
  placeholder: string
  ajuda?: string
  /** Estes tipos pedem uma data (o dia do aniversário). */
  comData?: boolean
  comTelefone?: boolean
  multilinha?: boolean
}

const SECOES: Secao[] = [
  {
    tipo: 'aniversario',
    titulo: 'Aniversários',
    icone: Cake,
    cor: 'text-pink-500',
    rotulo: 'Incluir aniversariante',
    placeholder: 'Nome de quem faz aniversário',
    ajuda: 'Quem já tem cadastro aparece sozinho. Use o botão abaixo só para quem ainda não está cadastrado.',
    comData: true,
    comTelefone: true,
  },
  {
    tipo: 'bodas',
    titulo: 'Aniversários de casamento',
    icone: Heart,
    cor: 'text-rose-500',
    rotulo: 'Incluir casal',
    placeholder: 'Ex.: João e Maria',
    ajuda: 'Os casais cadastrados com data de casamento entram automaticamente.',
    comData: true,
    comTelefone: true,
  },
  {
    tipo: 'oracao',
    titulo: 'Pedidos de oração',
    icone: HeartHandshake,
    cor: 'text-sky-500',
    rotulo: 'Incluir pedido',
    placeholder: 'Por quem / pelo quê vamos orar',
    multilinha: true,
    comTelefone: true,
  },
  {
    tipo: 'aviso',
    titulo: 'Avisos da semana',
    icone: Megaphone,
    cor: 'text-amber-500',
    rotulo: 'Incluir aviso',
    placeholder: 'Ex.: Ensaio do coral na quinta, às 20h',
    multilinha: true,
  },
]

type Rascunho = { titulo: string; descricao: string; data_referencia: string; telefone: string }
const RASCUNHO_VAZIO: Rascunho = { titulo: '', descricao: '', data_referencia: '', telefone: '' }

/** Mensagem sugerida ao abrir o WhatsApp a partir de um item da pauta. */
function textoItem(item: { tipo: PautaTipo; titulo: string }): string {
  if (item.tipo === 'bodas') return 'Parabéns pelo aniversário de casamento! Que Deus continue abençoando a família de vocês.'
  if (item.tipo === 'aniversario') return `Parabéns, ${item.titulo.split(' ')[0]}! Que Deus te abençoe grandemente neste novo ano de vida.`
  if (item.tipo === 'oracao') return 'Paz do Senhor! Passando para dizer que estamos orando por você.'
  return 'Paz do Senhor!'
}

/** Bolinha de "feito", igual à do acompanhamento do visitante. */
function Marcador({ feito, onClick, disabled }: { feito: boolean; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={feito}
      aria-label={feito ? 'Marcar como pendente' : 'Marcar como concluído'}
      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
        feito
          ? 'bg-emerald-500 text-white'
          : 'border-2 border-muted-foreground/30 hover:border-emerald-500'
      } ${disabled ? 'cursor-default' : 'cursor-pointer'}`}
    >
      {feito && <Check className="h-3.5 w-3.5" />}
    </button>
  )
}

function LinkWhats({ telefone, texto }: { telefone: string | null; texto: string }) {
  const numero = numeroWhatsApp(telefone)
  if (!numero) return null
  return (
    <a
      href={`https://wa.me/${numero}?text=${encodeURIComponent(texto)}`}
      target="_blank"
      rel="noopener noreferrer"
      title="Enviar mensagem no WhatsApp"
      className="text-emerald-600 hover:text-emerald-500 shrink-0 print:hidden"
    >
      <MessageCircle className="h-4 w-4" />
    </a>
  )
}

function PautaInner() {
  const { token, temPermissao, filtroCongregacao, congregacoesAcesso } = useAuth()
  const { toast } = useToast()
  const podeEditar = temPermissao('pauta_editar')

  const [congs, setCongs] = useState<{ id: number; nome: string }[]>([])
  const [congId, setCongId] = useState<number | null>(filtroCongregacao)
  const [semana, setSemana] = useState(() => segundaFeira(hojeISO()))
  const [dados, setDados] = useState<PautaSemana | null>(null)
  const [loading, setLoading] = useState(true)
  const [ocupado, setOcupado] = useState<string | null>(null)

  const [adicionando, setAdicionando] = useState<PautaTipo | null>(null)
  const [editando, setEditando] = useState<number | null>(null)
  const [rascunho, setRascunho] = useState<Rascunho>(RASCUNHO_VAZIO)

  const semanaAtual = segundaFeira(hojeISO())

  // Congregações disponíveis — a pauta é sempre de UMA congregação.
  useEffect(() => {
    if (!token) return
    fetch('/api/congregacoes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then((lista: { id: number; nome: string }[]) => {
        const l = lista || []
        setCongs(l)
        setCongId(atual => {
          if (atual) return atual
          if (filtroCongregacao) return filtroCongregacao
          if (congregacoesAcesso?.length === 1) return congregacoesAcesso[0]
          return l.length === 1 ? l[0].id : null
        })
      })
      .catch(() => {})
  }, [token, filtroCongregacao, congregacoesAcesso])

  // O filtro da barra lateral manda: trocar de congregação lá troca a pauta.
  useEffect(() => {
    if (filtroCongregacao) setCongId(filtroCongregacao)
  }, [filtroCongregacao])

  const carregar = useCallback(async () => {
    if (!token || !congId) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/pauta?congregacao=${congId}&semana=${semana}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setDados(await res.json())
      else setDados(null)
    } catch {
      setDados(null)
    } finally {
      setLoading(false)
    }
  }, [token, congId, semana])

  useEffect(() => { carregar() }, [carregar])

  const fecharFormulario = () => {
    setAdicionando(null)
    setEditando(null)
    setRascunho(RASCUNHO_VAZIO)
  }

  // ─── Ações ────────────────────────────────────────────────────────────────

  const marcarAutomatico = async (a: PautaAutomatico) => {
    if (!podeEditar || !dados) return
    const novo = !a.concluido
    setDados(d => d && ({
      ...d,
      automaticos: d.automaticos.map(x => x.chave === a.chave ? { ...x, concluido: novo } : x),
    }))
    try {
      const res = await fetch('/api/pauta/marcar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ congregacao_id: dados.congregacao_id, semana_inicio: dados.semana_inicio, chave: a.chave, concluido: novo }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast({ title: 'Não deu para salvar a marcação.', variant: 'destructive' })
      carregar()
    }
  }

  const marcarItem = async (item: PautaItem) => {
    if (!podeEditar) return
    const novo = !item.concluido
    setDados(d => d && ({ ...d, itens: d.itens.map(i => i.id === item.id ? { ...i, concluido: novo } : i) }))
    try {
      const res = await fetch(`/api/pauta/${item.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ concluido: novo }),
      })
      if (!res.ok) throw new Error()
    } catch {
      toast({ title: 'Não deu para salvar a marcação.', variant: 'destructive' })
      carregar()
    }
  }

  const adiar = async (item: PautaItem) => {
    setOcupado(`adiar-${item.id}`)
    try {
      const res = await fetch(`/api/pauta/${item.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao: 'adiar' }),
      })
      if (!res.ok) throw new Error()
      setDados(d => d && ({ ...d, itens: d.itens.filter(i => i.id !== item.id) }))
      toast({ title: '→ Item passou para a próxima semana.' })
    } catch {
      toast({ title: 'Não deu para adiar o item.', variant: 'destructive' })
    } finally {
      setOcupado(null)
    }
  }

  const excluir = async (item: PautaItem) => {
    setOcupado(`excluir-${item.id}`)
    try {
      const res = await fetch(`/api/pauta/${item.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error()
      setDados(d => d && ({ ...d, itens: d.itens.filter(i => i.id !== item.id) }))
    } catch {
      toast({ title: 'Não deu para remover o item.', variant: 'destructive' })
    } finally {
      setOcupado(null)
    }
  }

  const salvar = async (secao: Secao) => {
    const titulo = rascunho.titulo.trim()
    if (!titulo) { toast({ title: 'Escreva o item da pauta.', variant: 'destructive' }); return }
    if (secao.comData && !rascunho.data_referencia) {
      toast({ title: 'Informe a data.', variant: 'destructive' }); return
    }
    if (!dados) return

    setOcupado('salvando')
    try {
      const corpo = {
        congregacao_id: dados.congregacao_id,
        semana_inicio: dados.semana_inicio,
        tipo: secao.tipo,
        titulo,
        descricao: rascunho.descricao,
        data_referencia: rascunho.data_referencia || null,
        telefone: rascunho.telefone,
      }
      const res = await fetch(editando ? `/api/pauta/${editando}` : '/api/pauta', {
        method: editando ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      })
      const salvo = await res.json()
      if (!res.ok) { toast({ title: salvo.error || 'Erro ao salvar.', variant: 'destructive' }); return }
      setDados(d => d && ({
        ...d,
        itens: editando ? d.itens.map(i => i.id === editando ? salvo : i) : [...d.itens, salvo],
      }))
      fecharFormulario()
    } finally {
      setOcupado(null)
    }
  }

  // ─── Auxiliares de exibição ───────────────────────────────────────────────

  const autosPorTipo = useMemo(() => {
    const mapa: Record<string, PautaAutomatico[]> = { aniversario: [], bodas: [] }
    for (const a of dados?.automaticos ?? []) mapa[a.tipo]?.push(a)
    return mapa
  }, [dados])

  const itensPorTipo = useMemo(() => {
    const mapa: Record<string, PautaItem[]> = { aniversario: [], bodas: [], oracao: [], aviso: [] }
    for (const i of dados?.itens ?? []) mapa[i.tipo]?.push(i)
    return mapa
  }, [dados])

  const copiarPauta = async () => {
    if (!dados) return
    const linhas: string[] = [`*Pauta — ${rotuloSemana(dados.semana_inicio)}*`, `_${dados.congregacao_nome}_`, '']
    for (const secao of SECOES) {
      const autos = autosPorTipo[secao.tipo] ?? []
      const manuais = itensPorTipo[secao.tipo] ?? []
      if (autos.length === 0 && manuais.length === 0) continue
      linhas.push(`*${secao.titulo}*`)
      for (const a of autos) {
        const quem = a.tipo === 'bodas' && a.conjuge_nome ? `${a.nome} e ${a.conjuge_nome}` : a.nome
        linhas.push(`• ${quem} — ${rotuloDia(a.dia)}${a.anos ? ` (${a.anos} ${a.anos === 1 ? 'ano' : 'anos'})` : ''}`)
      }
      for (const i of manuais) {
        linhas.push(`• ${i.titulo}${i.descricao ? ` — ${i.descricao}` : ''}`)
      }
      linhas.push('')
    }
    try {
      await navigator.clipboard.writeText(linhas.join('\n').trim())
      toast({ title: '✓ Pauta copiada!' })
    } catch {
      toast({ title: 'Não deu para copiar automaticamente.', variant: 'destructive' })
    }
  }

  const totalFeitos = (tipo: PautaTipo) => {
    const autos = autosPorTipo[tipo] ?? []
    const manuais = itensPorTipo[tipo] ?? []
    const total = autos.length + manuais.length
    const feitos = autos.filter(a => a.concluido).length + manuais.filter(i => i.concluido).length
    return { total, feitos }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (congs.length > 1 && !congId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Pauta da Semana</h1>
        <Card>
          <CardContent className="py-6 space-y-3">
            <p className="text-sm text-muted-foreground">De qual congregação é a pauta?</p>
            <select
              className="h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 text-sm"
              value=""
              onChange={e => setCongId(Number(e.target.value) || null)}
            >
              <option value="">Selecione...</option>
              {congs.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Cabeçalho + navegação por semana */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Pauta da Semana</h1>
            <p className="text-sm text-muted-foreground">
              {dados?.congregacao_nome || 'Carregando...'} — o que o dirigente precisa saber neste domingo.
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Button variant="outline" size="sm" onClick={copiarPauta} disabled={!dados}>
              <Copy className="h-4 w-4" /> Copiar
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()} disabled={!dados}>
              <Printer className="h-4 w-4" /> Imprimir
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="p-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" aria-label="Semana anterior" onClick={() => setSemana(s => addDias(s, -7))}>
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center min-w-[11rem]">
                <p className="font-semibold leading-tight capitalize">{rotuloSemana(semana)}</p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {semana === semanaAtual ? 'Esta semana' : semana < semanaAtual ? 'Semana passada' : 'Semana futura'}
                </p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Próxima semana" onClick={() => setSemana(s => addDias(s, 7))}>
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center gap-2 print:hidden">
              {semana !== semanaAtual && (
                <Button variant="secondary" size="sm" onClick={() => setSemana(semanaAtual)}>
                  Semana atual
                </Button>
              )}
              {congs.length > 1 && (
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm max-w-[12rem]"
                  value={congId ?? ''}
                  onChange={e => setCongId(Number(e.target.value) || null)}
                >
                  {congs.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !dados ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">
          Não foi possível carregar a pauta desta semana.
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {SECOES.map(secao => {
            const Icone = secao.icone
            const autos = autosPorTipo[secao.tipo] ?? []
            const manuais = itensPorTipo[secao.tipo] ?? []
            const { total, feitos } = totalFeitos(secao.tipo)
            const formAberto = adicionando === secao.tipo

            return (
              <Card key={secao.tipo} className="break-inside-avoid">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Icone className={`h-5 w-5 ${secao.cor}`} />
                      {secao.titulo}
                    </CardTitle>
                    {total > 0 && (
                      <Badge variant={feitos === total ? 'success' : 'secondary'} className="shrink-0">
                        {feitos}/{total}
                      </Badge>
                    )}
                  </div>
                  {secao.ajuda && (
                    <p className="text-[11px] text-muted-foreground print:hidden">{secao.ajuda}</p>
                  )}
                </CardHeader>

                <CardContent className="space-y-1.5">
                  {total === 0 && !formAberto && (
                    <p className="text-sm text-muted-foreground py-2">Nada nesta semana.</p>
                  )}

                  {/* Automáticos (de quem já está cadastrado) */}
                  {autos.map(a => {
                    const quem = a.tipo === 'bodas' && a.conjuge_nome ? `${a.nome} e ${a.conjuge_nome}` : a.nome
                    return (
                      <div key={a.chave} className="flex items-start gap-2.5 py-1.5 border-b border-border/50 last:border-0">
                        <Marcador feito={a.concluido} onClick={() => marcarAutomatico(a)} disabled={!podeEditar} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm leading-snug ${a.concluido ? 'line-through text-muted-foreground' : ''}`}>
                            {quem}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {rotuloDia(a.dia)}
                            {!!a.anos && ` · ${a.anos} ${a.anos === 1 ? 'ano' : 'anos'}`}
                          </p>
                        </div>
                        <LinkWhats telefone={a.telefone} texto={textoItem({ tipo: a.tipo, titulo: a.nome })} />
                      </div>
                    )
                  })}

                  {/* Itens digitados pela recepção */}
                  {manuais.map(item => (
                    editando === item.id ? (
                      <FormularioItem
                        key={item.id}
                        secao={secao}
                        rascunho={rascunho}
                        setRascunho={setRascunho}
                        salvando={ocupado === 'salvando'}
                        onSalvar={() => salvar(secao)}
                        onCancelar={fecharFormulario}
                      />
                    ) : (
                      <div key={item.id} className="flex items-start gap-2.5 py-1.5 border-b border-border/50 last:border-0">
                        <Marcador feito={item.concluido} onClick={() => marcarItem(item)} disabled={!podeEditar} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm leading-snug ${item.concluido ? 'line-through text-muted-foreground' : ''}`}>
                            {item.titulo}
                          </p>
                          {item.descricao && (
                            <p className="text-xs text-muted-foreground whitespace-pre-wrap">{item.descricao}</p>
                          )}
                          {(item.data_referencia || item.adiado_de) && (
                            <p className="text-[11px] text-muted-foreground">
                              {[
                                item.data_referencia && rotuloDia(item.data_referencia),
                                item.adiado_de && 'veio da semana passada',
                              ].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                        <LinkWhats telefone={item.telefone} texto={textoItem(item)} />
                        {podeEditar && (
                          <div className="flex items-center gap-0.5 shrink-0 print:hidden">
                            <button
                              type="button"
                              title="Passar para a próxima semana"
                              onClick={() => adiar(item)}
                              disabled={ocupado === `adiar-${item.id}`}
                              className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                              <CornerDownRight className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Editar"
                              onClick={() => {
                                setAdicionando(null)
                                setEditando(item.id)
                                setRascunho({
                                  titulo: item.titulo,
                                  descricao: item.descricao || '',
                                  data_referencia: item.data_referencia || '',
                                  telefone: item.telefone || '',
                                })
                              }}
                              className="p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="Remover da pauta"
                              onClick={() => excluir(item)}
                              disabled={ocupado === `excluir-${item.id}`}
                              className="p-1.5 rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  ))}

                  {/* Incluir novo */}
                  {podeEditar && (formAberto ? (
                    <FormularioItem
                      secao={secao}
                      rascunho={rascunho}
                      setRascunho={setRascunho}
                      salvando={ocupado === 'salvando'}
                      onSalvar={() => salvar(secao)}
                      onCancelar={fecharFormulario}
                    />
                  ) : (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-muted-foreground print:hidden"
                      onClick={() => {
                        setEditando(null)
                        setRascunho({ ...RASCUNHO_VAZIO, data_referencia: secao.comData ? semana : '' })
                        setAdicionando(secao.tipo)
                      }}
                    >
                      <Plus className="h-4 w-4" /> {secao.rotulo}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FormularioItem({
  secao, rascunho, setRascunho, salvando, onSalvar, onCancelar,
}: {
  secao: Secao
  rascunho: Rascunho
  setRascunho: (r: Rascunho) => void
  salvando: boolean
  onSalvar: () => void
  onCancelar: () => void
}) {
  const set = (k: keyof Rascunho, v: string) => setRascunho({ ...rascunho, [k]: v })

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2.5 print:hidden">
      <div className="space-y-1">
        <Label className="text-xs">{secao.tipo === 'oracao' || secao.tipo === 'aviso' ? 'O que entra na pauta' : 'Quem'}</Label>
        {secao.multilinha ? (
          <Textarea
            rows={2}
            autoFocus
            value={rascunho.titulo}
            onChange={e => set('titulo', e.target.value)}
            placeholder={secao.placeholder}
          />
        ) : (
          <Input
            autoFocus
            value={rascunho.titulo}
            onChange={e => set('titulo', e.target.value)}
            placeholder={secao.placeholder}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onSalvar() } }}
          />
        )}
      </div>

      {(secao.comData || secao.comTelefone) && (
      <div className="grid grid-cols-2 gap-2">
        {secao.comData && (
          <div className="space-y-1">
            <Label className="text-xs">Data</Label>
            <Input type="date" value={rascunho.data_referencia} onChange={e => set('data_referencia', e.target.value)} />
          </div>
        )}
        {secao.comTelefone && (
          <div className="space-y-1">
            <Label className="text-xs">Telefone (opcional)</Label>
            <Input value={rascunho.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(00) 00000-0000" />
          </div>
        )}
      </div>
      )}

      {!secao.multilinha && (
        <div className="space-y-1">
          <Label className="text-xs">Observação (opcional)</Label>
          <Input value={rascunho.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Algo a mais para o dirigente saber" />
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={onSalvar} disabled={salvando}>
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancelar}>
          <X className="h-4 w-4" /> Cancelar
        </Button>
      </div>
    </div>
  )
}

export default function PautaPage() {
  return (
    <RequirePermission perm={['pauta_ver', 'pauta_editar']}>
      <PautaInner />
    </RequirePermission>
  )
}
