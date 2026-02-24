"use client"

import { useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, CalendarDays } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  token: string | null
}

function hoje(): string {
  return new Date().toISOString().split('T')[0]
}

export function VisitorModal({ open, onClose, onSuccess, token }: Props) {
  const { toast } = useToast()
  const [form, setForm] = useState({
    nome: '',
    telefone_principal: '',
    informacoes_complementares: '',
    data_visita: hoje(),
  })
  const [saving, setSaving] = useState(false)

  const reset = () => setForm({
    nome: '',
    telefone_principal: '',
    informacoes_complementares: '',
    data_visita: hoje(),
  })

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({ title: 'Nome é obrigatório.', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      // 1. Cria o visitante como membro
      const membroRes = await fetch('/api/membros', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          telefone_principal: form.telefone_principal,
          informacoes_complementares: form.informacoes_complementares,
          tipo_participante: 'Visitante',
        }),
      })
      const membroData = await membroRes.json()

      if (!membroRes.ok) {
        toast({ title: membroData.error || 'Erro ao cadastrar.', variant: 'destructive' })
        return
      }

      // 2. Registra a visita com a data selecionada
      try {
        await fetch('/api/visitas', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            membro_id: membroData.id,
            data_visita: form.data_visita || hoje(),
            observacoes: form.informacoes_complementares || null,
          }),
        })
      } catch {
        // visita é opcional — não bloqueia o fluxo
      }

      toast({ title: '✓ Visitante registrado!' })
      reset()
      onSuccess()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastro Rápido — Visitante</DialogTitle>
          <DialogDescription>
            Informe os dados básicos. Você pode completar o cadastro depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="v-nome">Nome completo *</Label>
            <Input
              id="v-nome"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Nome do visitante"
              autoFocus
            />
          </div>

          {/* Telefone */}
          <div className="space-y-2">
            <Label htmlFor="v-tel">Telefone</Label>
            <Input
              id="v-tel"
              type="tel"
              value={form.telefone_principal}
              onChange={e => setForm(f => ({ ...f, telefone_principal: e.target.value }))}
              placeholder="(00) 00000-0000"
            />
          </div>

          {/* Data da visita */}
          <div className="space-y-2">
            <Label htmlFor="v-data">Data da Visita</Label>
            <div className="flex gap-2">
              <Input
                id="v-data"
                type="date"
                value={form.data_visita}
                onChange={e => setForm(f => ({ ...f, data_visita: e.target.value }))}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setForm(f => ({ ...f, data_visita: hoje() }))}
                className="shrink-0 gap-1.5"
              >
                <CalendarDays className="h-3.5 w-3.5" />
                Hoje
              </Button>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="v-obs">Observações</Label>
            <Input
              id="v-obs"
              value={form.informacoes_complementares}
              onChange={e => setForm(f => ({ ...f, informacoes_complementares: e.target.value }))}
              placeholder="Como conheceu a igreja, indicação, etc."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Cadastrar Visitante
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
