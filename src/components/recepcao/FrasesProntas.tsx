"use client"

import { useEffect, useState } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, Trash2, Save } from 'lucide-react'
import type { MensagemModelo } from '@/types'

export function FrasesProntas({
  open,
  token,
  onClose,
  onChanged,
}: {
  open: boolean
  token: string | null
  onClose: () => void
  onChanged?: () => void
}) {
  const { toast } = useToast()
  const [modelos, setModelos] = useState<MensagemModelo[]>([])
  const [loading, setLoading] = useState(false)
  const [rasc, setRasc] = useState<Record<number, { titulo: string; texto: string }>>({})
  const [novo, setNovo] = useState({ titulo: '', texto: '' })
  const [salvando, setSalvando] = useState<number | 'novo' | null>(null)

  const carregar = () => {
    if (!token) return
    setLoading(true)
    fetch('/api/mensagens', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then((d: MensagemModelo[]) => {
        setModelos(d)
        setRasc(Object.fromEntries(d.map(m => [m.id, { titulo: m.titulo, texto: m.texto }])))
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { if (open) carregar() }, [open, token])

  const salvar = async (id: number) => {
    const r = rasc[id]
    if (!r?.titulo.trim() || !r?.texto.trim()) { toast({ title: 'Preencha título e texto.', variant: 'destructive' }); return }
    setSalvando(id)
    try {
      const res = await fetch(`/api/mensagens/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(r),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Frase salva.' })
      carregar(); onChanged?.()
    } catch {
      toast({ title: 'Erro ao salvar.', variant: 'destructive' })
    } finally {
      setSalvando(null)
    }
  }

  const excluir = async (id: number, titulo: string) => {
    if (!confirm(`Excluir a frase "${titulo}"?`)) return
    const res = await fetch(`/api/mensagens/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { toast({ title: 'Frase excluída.' }); carregar(); onChanged?.() }
  }

  const criar = async () => {
    if (!novo.titulo.trim() || !novo.texto.trim()) { toast({ title: 'Preencha título e texto.', variant: 'destructive' }); return }
    setSalvando('novo')
    try {
      const res = await fetch('/api/mensagens', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(novo),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Frase criada.' })
      setNovo({ titulo: '', texto: '' })
      carregar(); onChanged?.()
    } catch {
      toast({ title: 'Erro ao criar.', variant: 'destructive' })
    } finally {
      setSalvando(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Frases prontas</DialogTitle>
          <DialogDescription>
            Use <code className="text-xs">{'{nome}'}</code>, <code className="text-xs">{'{congregacao}'}</code>,{' '}
            <code className="text-xs">{'{culto}'}</code>, <code className="text-xs">{'{data}'}</code>,{' '}
            <code className="text-xs">{'{hora}'}</code> e <code className="text-xs">{'{horarios}'}</code> (lista
            completa dos cultos) no texto — são preenchidos na hora de enviar.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-4">
            {modelos.map(m => {
              const r = rasc[m.id] ?? { titulo: m.titulo, texto: m.texto }
              const mudou = r.titulo !== m.titulo || r.texto !== m.texto
              return (
                <div key={m.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex gap-2">
                    <Input
                      value={r.titulo}
                      onChange={e => setRasc(p => ({ ...p, [m.id]: { ...r, titulo: e.target.value } }))}
                      placeholder="Título"
                      className="h-9"
                    />
                    <Button
                      variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive shrink-0"
                      onClick={() => excluir(m.id, m.titulo)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    value={r.texto}
                    onChange={e => setRasc(p => ({ ...p, [m.id]: { ...r, texto: e.target.value } }))}
                    rows={3}
                  />
                  {mudou && (
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => salvar(m.id)} disabled={salvando === m.id}>
                        {salvando === m.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Salvar
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Nova frase */}
            <div className="space-y-2 rounded-lg border border-dashed p-3">
              <Input
                value={novo.titulo}
                onChange={e => setNovo(n => ({ ...n, titulo: e.target.value }))}
                placeholder="Título da nova frase"
                className="h-9"
              />
              <Textarea
                value={novo.texto}
                onChange={e => setNovo(n => ({ ...n, texto: e.target.value }))}
                rows={3}
                placeholder="Ex.: Olá, {nome}! Nosso próximo culto será {data} às {hora}..."
              />
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={criar} disabled={salvando === 'novo'}>
                  {salvando === 'novo' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Adicionar frase
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
