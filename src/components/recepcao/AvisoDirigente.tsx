"use client"

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { MessageCircle, Check } from 'lucide-react'

export interface AvisoDados {
  /** Nome do dirigente cadastrado na congregação — só um lembrete, não define o destino. */
  dirigenteNome?: string | null
  congregacao?: string | null
  /** Campos disponíveis, na ordem de exibição. */
  campos: { key: string; label: string; valor: string }[]
}

/** Campos que começam marcados (aviso simples: nome, quem convidou e observações). */
const PADRAO = ['nome', 'convidado_por', 'observacoes']

export function AvisoDirigente({
  aviso,
  onClose,
}: {
  aviso: AvisoDados | null
  onClose: () => void
}) {
  const [sel, setSel] = useState<Set<string>>(new Set(PADRAO))

  useEffect(() => {
    if (aviso) {
      const disponiveis = new Set(aviso.campos.map(c => c.key))
      setSel(new Set(PADRAO.filter(k => disponiveis.has(k))))
    }
  }, [aviso])

  if (!aviso) return null

  const toggle = (k: string) => setSel(prev => {
    const n = new Set(prev)
    n.has(k) ? n.delete(k) : n.add(k)
    return n
  })

  const linhas = aviso.campos.filter(c => sel.has(c.key))
  const texto =
    `Novo visitante${aviso.congregacao ? ` — ${aviso.congregacao}` : ''}\n\n` +
    (linhas.length
      ? linhas.map(c => `${c.label}: ${c.valor || '—'}`).join('\n')
      : '(nenhum campo selecionado)')

  // Sem número fixo: o WhatsApp abre e a própria pessoa escolhe pra quem manda
  // (o dirigente, um grupo de recepção, etc.).
  const url = `https://wa.me/?text=${encodeURIComponent(texto)}`

  return (
    <Dialog open={!!aviso} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Avisar sobre o visitante
          </DialogTitle>
          <DialogDescription>
            Escolha o que vai na mensagem. Ao abrir o WhatsApp, você escolhe o contato ou grupo
            {aviso.dirigenteNome ? ` (dirigente: ${aviso.dirigenteNome})` : ''}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          {aviso.campos.map(c => {
            const on = sel.has(c.key)
            return (
              <label key={c.key} className="flex items-center gap-2.5 cursor-pointer rounded px-1 py-1 hover:bg-accent/50 transition-colors">
                <span
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    on ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                  }`}
                >
                  {on && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
                </span>
                <span className="text-sm">
                  {c.label}
                  {c.valor && <span className="text-muted-foreground"> — {c.valor}</span>}
                </span>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(c.key)} />
              </label>
            )
          })}
        </div>

        <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap text-muted-foreground">
          {texto}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Fechar</Button>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setTimeout(onClose, 300)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            <MessageCircle className="h-4 w-4" />
            Abrir no WhatsApp
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
