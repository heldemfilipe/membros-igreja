"use client"

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { MessageCircle, Settings2 } from 'lucide-react'
import { numeroWhatsApp } from '@/lib/utils'
import type { MensagemModelo } from '@/types'

export interface AlvoMensagem {
  nome: string
  telefone: string | null
}

export function EnviarMensagemModal({
  alvo,
  token,
  onClose,
  onGerenciar,
}: {
  alvo: AlvoMensagem | null
  token: string | null
  onClose: () => void
  onGerenciar?: () => void
}) {
  const [modelos, setModelos] = useState<MensagemModelo[]>([])
  const [modeloId, setModeloId] = useState<number | ''>('')
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const [texto, setTexto] = useState('')
  const [editouManual, setEditouManual] = useState(false)

  useEffect(() => {
    if (!alvo || !token) return
    setModeloId(''); setData(''); setHora(''); setTexto(''); setEditouManual(false)
    fetch('/api/mensagens', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setModelos)
      .catch(() => {})
  }, [alvo, token])

  const modelo = modelos.find(m => m.id === modeloId)
  const precisaData = !!modelo && /\{data\}/.test(modelo.texto)
  const precisaHora = !!modelo && /\{hora\}/.test(modelo.texto)

  useEffect(() => {
    if (!alvo || editouManual) return
    if (!modelo) { setTexto(''); return }
    const primeiroNome = alvo.nome.trim().split(/\s+/)[0] || alvo.nome
    setTexto(
      modelo.texto
        .replace(/\{nome\}/g, primeiroNome)
        .replace(/\{data\}/g, data || '{data}')
        .replace(/\{hora\}/g, hora || '{hora}'),
    )
  }, [modelo, data, hora, alvo, editouManual])

  if (!alvo) return null

  const numero = numeroWhatsApp(alvo.telefone)
  const url = numero && texto.trim() ? `https://wa.me/${numero}?text=${encodeURIComponent(texto)}` : ''

  return (
    <Dialog open={!!alvo} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Mensagem para {alvo.nome}
          </DialogTitle>
          <DialogDescription>
            {numero ? `Vai para ${alvo.telefone}` : 'Este visitante não tem um telefone válido.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Frase pronta</Label>
            <select
              value={modeloId}
              onChange={e => { setModeloId(e.target.value ? Number(e.target.value) : ''); setEditouManual(false) }}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Escrever do zero</option>
              {modelos.map(m => <option key={m.id} value={m.id}>{m.titulo}</option>)}
            </select>
          </div>

          {(precisaData || precisaHora) && (
            <div className="grid grid-cols-2 gap-2">
              {precisaData && (
                <div className="space-y-1">
                  <Label className="text-xs">Data do culto</Label>
                  <Input value={data} onChange={e => { setData(e.target.value); setEditouManual(false) }} placeholder="ex.: domingo, 14/09" className="h-9" />
                </div>
              )}
              {precisaHora && (
                <div className="space-y-1">
                  <Label className="text-xs">Horário</Label>
                  <Input value={hora} onChange={e => { setHora(e.target.value); setEditouManual(false) }} placeholder="ex.: 19h" className="h-9" />
                </div>
              )}
            </div>
          )}

          <div className="space-y-1">
            <Label>Mensagem</Label>
            <Textarea
              value={texto}
              onChange={e => { setTexto(e.target.value); setEditouManual(true) }}
              rows={5}
              placeholder="Escreva a mensagem..."
            />
          </div>

          {onGerenciar && (
            <button
              type="button"
              onClick={onGerenciar}
              className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <Settings2 className="h-3.5 w-3.5" /> Gerenciar frases prontas
            </button>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">Fechar</Button>
          {url ? (
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
          ) : (
            <span className="text-xs text-amber-600 dark:text-amber-400 self-center">
              {numero ? 'Escreva a mensagem.' : 'Sem telefone válido.'}
            </span>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
