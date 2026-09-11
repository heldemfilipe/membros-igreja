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
import { DIAS_SEMANA } from '@/lib/constants'
import type { MensagemModelo, Culto } from '@/types'

export interface AlvoMensagem {
  nome: string
  telefone: string | null
  congregacao?: string | null
  cultos?: Culto[]
}

/** Próxima data (hoje ou depois) em que cai o dia da semana informado. */
function proximaOcorrencia(diaSemana: number, horario: string): { data: string; hora: string } {
  const agora = new Date()
  let diff = (diaSemana - agora.getDay() + 7) % 7
  if (diff === 0) {
    const [h, m] = horario.split(':').map(Number)
    const horarioHoje = new Date(agora)
    horarioHoje.setHours(h || 0, m || 0, 0, 0)
    if (agora > horarioHoje) diff = 7
  }
  const data = new Date(agora)
  data.setDate(data.getDate() + diff)
  const dd = String(data.getDate()).padStart(2, '0')
  const mm = String(data.getMonth() + 1).padStart(2, '0')
  return { data: `${DIAS_SEMANA[diaSemana].toLowerCase()}, ${dd}/${mm}`, hora: horario }
}

function montarHorarios(cultos: Culto[]): string {
  return [...cultos]
    .sort((a, b) => a.dia_semana - b.dia_semana || a.horario.localeCompare(b.horario))
    .map(c => `${DIAS_SEMANA[c.dia_semana]} às ${c.horario} — ${c.nome}`)
    .join('\n')
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
  const [cultoId, setCultoId] = useState<number | ''>('')
  const [data, setData] = useState('')
  const [hora, setHora] = useState('')
  const [texto, setTexto] = useState('')
  const [editouManual, setEditouManual] = useState(false)

  useEffect(() => {
    if (!alvo || !token) return
    setModeloId(''); setCultoId(''); setData(''); setHora(''); setTexto(''); setEditouManual(false)
    fetch('/api/mensagens', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(setModelos)
      .catch(() => {})
  }, [alvo, token])

  const modelo = modelos.find(m => m.id === modeloId)
  const precisaData = !!modelo && /\{data\}/.test(modelo.texto)
  const precisaHora = !!modelo && /\{hora\}/.test(modelo.texto)
  const culto = alvo?.cultos?.find(c => c.id === cultoId)

  const escolherCulto = (id: number | '') => {
    setCultoId(id)
    const c = alvo?.cultos?.find(x => x.id === id)
    if (c) {
      const prox = proximaOcorrencia(c.dia_semana, c.horario)
      setData(prox.data); setHora(prox.hora)
    }
    setEditouManual(false)
  }

  useEffect(() => {
    if (!alvo || editouManual) return
    if (!modelo) { setTexto(''); return }
    const primeiroNome = alvo.nome.trim().split(/\s+/)[0] || alvo.nome
    setTexto(
      modelo.texto
        .replace(/\{nome\}/g, primeiroNome)
        .replace(/\{congregacao\}/g, alvo.congregacao || '')
        .replace(/\{culto\}/g, culto?.nome || '')
        .replace(/\{horarios\}/g, alvo.cultos?.length ? montarHorarios(alvo.cultos) : '')
        .replace(/\{data\}/g, data || '{data}')
        .replace(/\{hora\}/g, hora || '{hora}'),
    )
  }, [modelo, data, hora, alvo, editouManual, culto])

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
            {modelos.length === 0 && onGerenciar && (
              <p className="text-xs text-muted-foreground">
                Nenhuma frase cadastrada ainda —{' '}
                <button type="button" onClick={onGerenciar} className="underline underline-offset-2 hover:text-foreground">
                  cadastrar frases
                </button>.
              </p>
            )}
          </div>

          {(precisaData || precisaHora) && !!alvo.cultos?.length && (
            <div className="space-y-1">
              <Label className="text-xs">Próximo culto</Label>
              <select
                value={cultoId}
                onChange={e => escolherCulto(e.target.value ? Number(e.target.value) : '')}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Preencher manualmente...</option>
                {alvo.cultos.map(c => (
                  <option key={c.id} value={c.id}>{DIAS_SEMANA[c.dia_semana]} às {c.horario} — {c.nome}</option>
                ))}
              </select>
            </div>
          )}

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
