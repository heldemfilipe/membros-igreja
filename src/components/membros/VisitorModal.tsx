"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Loader2, CalendarDays, Lock } from 'lucide-react'
import { numeroWhatsApp } from '@/lib/utils'
import { AvisoDirigente, type AvisoDados } from '@/components/recepcao/AvisoDirigente'

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
  token: string | null
}

type Cong = {
  id: number
  nome: string
  notificar_whatsapp?: boolean
  dirigente_nome?: string | null
  dirigente_telefone_efetivo?: string | null
}

function hoje(): string {
  return new Date().toISOString().split('T')[0]
}

function dataBR(iso: string): string {
  const [y, m, dd] = iso.split('-')
  return dd && m && y ? `${dd}/${m}/${y}` : iso
}

export function VisitorModal({ open, onClose, onSuccess, token }: Props) {
  const { toast } = useToast()
  const { filtroCongregacaoNome } = useAuth()
  const [congregacoes, setCongregacoes] = useState<Cong[]>([])
  const [form, setForm] = useState({
    nome: '',
    telefone_principal: '',
    informacoes_complementares: '',
    data_visita: hoje(),
    congregacao_nome: '',
  })
  const [saving, setSaving] = useState(false)
  const [aviso, setAviso] = useState<AvisoDados | null>(null)

  useEffect(() => {
    if (!token || !open) return
    fetch('/api/congregacoes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then((data: Cong[]) => {
        const lista = data || []
        setCongregacoes(lista)
        setForm(f => {
          if (f.congregacao_nome) return f
          if (filtroCongregacaoNome) return { ...f, congregacao_nome: filtroCongregacaoNome }
          if (lista.length === 1) return { ...f, congregacao_nome: lista[0].nome }
          return f
        })
      })
      .catch(() => {})
  }, [token, open, filtroCongregacaoNome])

  const reset = () => {
    setForm({
      nome: '', telefone_principal: '', informacoes_complementares: '',
      data_visita: hoje(), congregacao_nome: '',
    })
    setAviso(null)
  }

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast({ title: 'Nome é obrigatório.', variant: 'destructive' })
      return
    }
    if (!form.congregacao_nome) {
      toast({ title: 'Congregação é obrigatória.', variant: 'destructive' })
      return
    }

    // Abre a aba AGORA (dentro do clique) se a congregação avisa por WhatsApp,
    // para o navegador não bloquear como popup.
    const congPre = congregacoes.find(c => c.nome === form.congregacao_nome)
    const vaiAvisar = congPre?.notificar_whatsapp !== false && !!numeroWhatsApp(congPre?.dirigente_telefone_efetivo)
    const janela = vaiAvisar ? window.open('about:blank', '_blank') : null

    setSaving(true)
    try {
      const membroRes = await fetch('/api/membros', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: form.nome.trim(),
          telefone_principal: form.telefone_principal,
          informacoes_complementares: form.informacoes_complementares,
          tipo_participante: 'Visitante',
          igreja: form.congregacao_nome,
        }),
      })
      const membroData = await membroRes.json()
      if (!membroRes.ok) {
        janela?.close()
        toast({ title: membroData.error || 'Erro ao cadastrar.', variant: 'destructive' })
        return
      }

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
        // visita é opcional
      }

      onSuccess()
      toast({ title: '✓ Visitante registrado!' })

      // Aviso ao dirigente no WhatsApp, se a congregação tiver isso configurado
      const cong = congregacoes.find(c => c.nome === form.congregacao_nome)
      const numero = cong?.notificar_whatsapp !== false ? numeroWhatsApp(cong?.dirigente_telefone_efetivo) : ''
      const nome = form.nome.trim()
      const obs = form.informacoes_complementares.trim()
      if (numero) {
        const texto = `Novo visitante — ${form.congregacao_nome}\n\nNome: ${nome}\nObservações: ${obs || '—'}`
        const url = `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
        if (janela) {
          janela.location.href = url
          reset()
          onClose()
        } else {
          setAviso({
            numero,
            dirigenteNome: cong?.dirigente_nome || null,
            congregacao: form.congregacao_nome,
            campos: [
              { key: 'nome', label: 'Nome', valor: nome },
              { key: 'telefone', label: 'Telefone', valor: form.telefone_principal.trim() },
              { key: 'data_visita', label: 'Data da visita', valor: dataBR(form.data_visita || hoje()) },
              { key: 'observacoes', label: 'Observações', valor: obs },
            ],
          })
        }
      } else {
        janela?.close()
        reset()
        onClose()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <>
    <Dialog open={open && !aviso} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <>
            <DialogHeader>
              <DialogTitle>Cadastro Rápido — Visitante</DialogTitle>
              <DialogDescription>
                Informe os dados básicos. Você pode completar o cadastro depois.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
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

              <div className="space-y-2">
                <Label htmlFor="v-cong">Congregação *</Label>
                {(() => {
                  const cFixa = filtroCongregacaoNome || (congregacoes.length === 1 ? congregacoes[0].nome : null)
                  if (cFixa) {
                    return (
                      <div className="h-10 px-3 rounded-md border border-input bg-muted flex items-center gap-2 text-sm">
                        <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <span className="font-medium">{cFixa}</span>
                      </div>
                    )
                  }
                  if (congregacoes.length > 0) {
                    return (
                      <select
                        id="v-cong"
                        value={form.congregacao_nome}
                        onChange={e => setForm(f => ({ ...f, congregacao_nome: e.target.value }))}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="">Selecione...</option>
                        {congregacoes.map(c => (
                          <option key={c.id} value={c.nome}>{c.nome}</option>
                        ))}
                      </select>
                    )
                  }
                  return (
                    <Input
                      id="v-cong"
                      value={form.congregacao_nome}
                      onChange={e => setForm(f => ({ ...f, congregacao_nome: e.target.value }))}
                      placeholder="Nome da congregação"
                    />
                  )
                })()}
              </div>

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
                Cadastrar e Vincular
              </Button>
            </DialogFooter>
        </>
      </DialogContent>
    </Dialog>

    <AvisoDirigente aviso={aviso} onClose={handleClose} />
    </>
  )
}
