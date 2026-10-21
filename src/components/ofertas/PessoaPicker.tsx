"use client"

import { useEffect, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Loader2, UserPlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Pessoa escolhida para uma linha do detalhe da oferta. */
export type PessoaEscolhida =
  | { tipo: 'membro'; id: number; nome: string }
  | { tipo: 'pendente'; id: number; nome: string }
  | { tipo: 'nova'; nome: string; telefone: string }

interface Resultado {
  membros: { id: number; nome: string; conhecido_como?: string | null; tipo_participante: string }[]
  pendentes: { id: number; nome: string; telefone?: string | null }[]
}

interface Props {
  token: string | null
  congregacaoId: number
  valor: PessoaEscolhida | null
  onChange: (p: PessoaEscolhida | null) => void
  disabled?: boolean
}

/**
 * Busca por nome entre os cadastrados da congregação e as pessoas já
 * pendentes; se não achar, oferece "pessoa não cadastrada" (vai para a
 * lista de pendentes de cadastro).
 */
export function PessoaPicker({ token, congregacaoId, valor, onChange, disabled }: Props) {
  const [texto, setTexto] = useState('')
  const [aberto, setAberto] = useState(false)
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState<Resultado>({ membros: [], pendentes: [] })
  const timer = useRef<ReturnType<typeof setTimeout>>()
  const caixa = useRef<HTMLDivElement>(null)

  useEffect(() => {
    clearTimeout(timer.current)
    const q = texto.trim()
    if (q.length < 2) { setRes({ membros: [], pendentes: [] }); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const r = await fetch(`/api/ofertas/pessoas?congregacao=${congregacaoId}&q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (r.ok) setRes(await r.json())
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer.current)
  }, [texto, congregacaoId, token])

  // Fecha a lista ao clicar fora.
  useEffect(() => {
    const fora = (e: MouseEvent) => { if (!caixa.current?.contains(e.target as Node)) setAberto(false) }
    document.addEventListener('mousedown', fora)
    return () => document.removeEventListener('mousedown', fora)
  }, [])

  if (valor) {
    return (
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 h-9 px-2.5 rounded-md border border-input bg-muted/30 text-sm">
          <span className="truncate flex-1">{valor.nome}</span>
          {valor.tipo !== 'membro' && (
            <span className="shrink-0 text-[10px] uppercase tracking-wide font-semibold text-amber-600 dark:text-amber-400">
              {valor.tipo === 'nova' ? 'sem cadastro' : 'pendente'}
            </span>
          )}
          {!disabled && (
            <button type="button" onClick={() => onChange(null)} aria-label="Trocar pessoa"
              className="shrink-0 h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {valor.tipo === 'nova' && !disabled && (
          <Input
            value={valor.telefone}
            onChange={e => onChange({ ...valor, telefone: e.target.value })}
            placeholder="Telefone (opcional)"
            className="h-8 text-sm"
            aria-label="Telefone da pessoa não cadastrada"
          />
        )}
      </div>
    )
  }

  const q = texto.trim()
  const vazio = !loading && q.length >= 2 && res.membros.length === 0 && res.pendentes.length === 0

  return (
    <div className="relative" ref={caixa}>
      <Input
        value={texto}
        onChange={e => { setTexto(e.target.value); setAberto(true) }}
        onFocus={() => setAberto(true)}
        placeholder="Buscar pessoa pelo nome"
        className="h-9"
        disabled={disabled}
        aria-label="Pessoa"
      />
      {aberto && q.length >= 2 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-md max-h-64 overflow-y-auto text-sm">
          {loading && (
            <div className="flex items-center gap-2 px-3 py-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando...
            </div>
          )}
          {res.membros.map(m => (
            <button key={`m${m.id}`} type="button"
              onClick={() => { onChange({ tipo: 'membro', id: m.id, nome: m.nome }); setTexto(''); setAberto(false) }}
              className="w-full text-left px-3 py-2 hover:bg-accent flex items-baseline justify-between gap-2">
              <span className="truncate">{m.nome}{m.conhecido_como ? ` "${m.conhecido_como}"` : ''}</span>
              <span className="text-xs text-muted-foreground shrink-0">{m.tipo_participante}</span>
            </button>
          ))}
          {res.pendentes.map(p => (
            <button key={`p${p.id}`} type="button"
              onClick={() => { onChange({ tipo: 'pendente', id: p.id, nome: p.nome }); setTexto(''); setAberto(false) }}
              className="w-full text-left px-3 py-2 hover:bg-accent flex items-baseline justify-between gap-2">
              <span className="truncate">{p.nome}</span>
              <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">pendente de cadastro</span>
            </button>
          ))}
          {vazio && <p className="px-3 py-2 text-muted-foreground">Ninguém com esse nome nesta congregação.</p>}
          <button type="button"
            onClick={() => { onChange({ tipo: 'nova', nome: q, telefone: '' }); setTexto(''); setAberto(false) }}
            className={cn('w-full text-left px-3 py-2 hover:bg-accent flex items-center gap-2 border-t border-border', 'text-primary')}>
            <UserPlus className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">Pessoa não cadastrada: &quot;{q}&quot;</span>
          </button>
        </div>
      )}
    </div>
  )
}
