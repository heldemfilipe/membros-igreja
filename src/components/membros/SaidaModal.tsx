"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { MOTIVOS_SAIDA } from '@/lib/constants'

interface Props {
  membro: { id: number; nome: string } | null
  token: string | null
  onClose: () => void
  onSuccess: (mensagem: string) => void
  onError: (mensagem: string) => void
}

function hoje(): string {
  return new Date().toISOString().split('T')[0]
}

export function SaidaModal({ membro, token, onClose, onSuccess, onError }: Props) {
  const [motivo, setMotivo] = useState('')
  const [outro, setOutro] = useState('')
  const [dataSaida, setDataSaida] = useState(hoje())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (membro) {
      setMotivo('')
      setOutro('')
      setDataSaida(hoje())
    }
  }, [membro])

  const podeSalvar = !!motivo && (motivo !== 'Outro' || outro.trim().length > 0)

  const confirmar = async () => {
    if (!membro || !podeSalvar) return
    setSaving(true)
    try {
      const res = await fetch(`/api/membros/${membro.id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ativo: false,
          data_saida: dataSaida,
          motivo_saida: motivo,
          motivo_saida_outro: motivo === 'Outro' ? outro.trim() : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) onError(data.error || 'Erro ao registrar a saída.')
      else onSuccess(data.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={!!membro} onOpenChange={o => { if (!o && !saving) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar saída</DialogTitle>
          <DialogDescription>
            {membro?.nome} ficará inativo. Os dados continuam guardados e é possível reativar depois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="saida-data">Data da saída</Label>
            <Input
              id="saida-data"
              type="date"
              value={dataSaida}
              max={hoje()}
              onChange={e => setDataSaida(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="saida-motivo">Motivo *</Label>
            <select
              id="saida-motivo"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              className="h-9 w-full px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione...</option>
              {MOTIVOS_SAIDA.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          {motivo === 'Outro' && (
            <div className="space-y-1.5">
              <Label htmlFor="saida-outro">Descreva o motivo *</Label>
              <Textarea
                id="saida-outro"
                value={outro}
                onChange={e => setOutro(e.target.value)}
                placeholder="Escreva o motivo da saída"
                maxLength={300}
                autoFocus
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={confirmar} disabled={!podeSalvar || saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Confirmar saída
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
