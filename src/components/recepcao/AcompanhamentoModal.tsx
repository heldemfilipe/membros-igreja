"use client"

import { useEffect, useState, type ReactNode } from 'react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Check } from 'lucide-react'
import type { VisitanteRecepcao, Acompanhamento } from '@/types'

export type VisitanteEdicao = Partial<Acompanhamento> & {
  nome: string
  telefone_principal: string | null
  email: string | null
  data_nascimento: string | null
  informacoes_complementares: string | null
}

type F = {
  // dados do visitante
  nome: string; telefone_principal: string; email: string; data_nascimento: string; informacoes_complementares: string
  // acompanhamento
  contato_feito: boolean; contato_por: string; contato_data: string
  visita_agendada: boolean; visita_agendada_por: string; visita_casa_data: string; visita_casa_feita: boolean
  voltou_culto: boolean; voltou_culto_data: string
  discipulado: boolean; discipulado_inicio: string; discipulador: string
  batizado: boolean; congregacao_origem: string
  observacoes: string
}

const iso = (v: string | null | undefined) => (v ? v.split('T')[0] : '')

function fromVisitante(v: VisitanteRecepcao): F {
  return {
    nome: v.nome,
    telefone_principal: v.telefone_principal ?? '',
    email: v.email ?? '',
    data_nascimento: iso(v.data_nascimento),
    informacoes_complementares: v.informacoes_complementares ?? '',
    contato_feito: v.contato_feito, contato_por: v.contato_por ?? '', contato_data: iso(v.contato_data),
    visita_agendada: v.visita_agendada, visita_agendada_por: v.visita_agendada_por ?? '',
    visita_casa_data: iso(v.visita_casa_data), visita_casa_feita: v.visita_casa_feita,
    voltou_culto: v.voltou_culto, voltou_culto_data: iso(v.voltou_culto_data),
    discipulado: v.discipulado, discipulado_inicio: iso(v.discipulado_inicio), discipulador: v.discipulador ?? '',
    batizado: v.batizado, congregacao_origem: v.congregacao_origem ?? '',
    observacoes: v.observacoes ?? '',
  }
}

function Box({ on }: { on: boolean }) {
  return (
    <span className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
      on ? 'bg-primary border-primary' : 'border-muted-foreground/40'
    }`}>
      {on && <Check className="h-2.5 w-2.5 text-primary-foreground" />}
    </span>
  )
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none" onClick={onToggle}>
      <Box on={on} />
      <span className="text-sm">{label}</span>
    </label>
  )
}

function Secao({ label, on, onToggle, children }: {
  label: string; on: boolean; onToggle: () => void; children?: ReactNode
}) {
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <Toggle label={label} on={on} onToggle={onToggle} />
      {on && children && (
        <div className="pl-6 grid grid-cols-1 sm:grid-cols-2 gap-2">{children}</div>
      )}
    </div>
  )
}

export function AcompanhamentoModal({
  visitante,
  onClose,
  onSalvar,
}: {
  visitante: VisitanteRecepcao | null
  onClose: () => void
  onSalvar: (dados: VisitanteEdicao) => Promise<void> | void
}) {
  const [f, setF] = useState<F | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setF(visitante ? fromVisitante(visitante) : null)
  }, [visitante])

  if (!visitante || !f) return null

  const set = <K extends keyof F>(k: K, v: F[K]) => setF(p => (p ? { ...p, [k]: v } : p))

  const salvar = async () => {
    if (!f.nome.trim()) return
    setSaving(true)
    try {
      await onSalvar({
        nome: f.nome.trim(),
        telefone_principal: f.telefone_principal.trim() || null,
        email: f.email.trim() || null,
        data_nascimento: f.data_nascimento || null,
        informacoes_complementares: f.informacoes_complementares.trim() || null,
        contato_feito: f.contato_feito,
        contato_por: f.contato_por.trim() || null,
        contato_data: f.contato_data || null,
        visita_agendada: f.visita_agendada,
        visita_agendada_por: f.visita_agendada_por.trim() || null,
        visita_casa_data: f.visita_casa_data || null,
        visita_casa_feita: f.visita_casa_feita,
        voltou_culto: f.voltou_culto,
        voltou_culto_data: f.voltou_culto_data || null,
        discipulado: f.discipulado,
        discipulado_inicio: f.discipulado_inicio || null,
        discipulador: f.discipulador.trim() || null,
        batizado: f.batizado,
        congregacao_origem: f.congregacao_origem.trim() || null,
        observacoes: f.observacoes.trim() || null,
      })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const campoData = (label: string, k: 'contato_data' | 'visita_casa_data' | 'voltou_culto_data' | 'discipulado_inicio') => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="date" value={f[k]} onChange={e => set(k, e.target.value)} className="h-9" />
    </div>
  )
  const campoTexto = (label: string, k: 'contato_por' | 'visita_agendada_por' | 'discipulador', ph = '') => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input value={f[k]} onChange={e => set(k, e.target.value)} placeholder={ph} className="h-9" />
    </div>
  )

  return (
    <Dialog open={!!visitante} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar visitante</DialogTitle>
          <DialogDescription>{visitante.igreja || 'Sem congregação'}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Dados do visitante */}
          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dados</p>
            <div className="space-y-1">
              <Label className="text-xs">Nome *</Label>
              <Input value={f.nome} onChange={e => set('nome', e.target.value)} className="h-9" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Telefone</Label>
                <Input type="tel" value={f.telefone_principal} onChange={e => set('telefone_principal', e.target.value)} placeholder="(00) 00000-0000" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data de nascimento</Label>
                <Input type="date" value={f.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} className="h-9" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">E-mail</Label>
              <Input type="email" value={f.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Como conheceu / observações da visita</Label>
              <Textarea value={f.informacoes_complementares} onChange={e => set('informacoes_complementares', e.target.value)} rows={2} placeholder="Indicação, evento, rede social..." />
            </div>
          </div>

          <Secao label="Entrou em contato" on={f.contato_feito} onToggle={() => set('contato_feito', !f.contato_feito)}>
            {campoTexto('Quem entrou em contato', 'contato_por', 'Nome')}
            {campoData('Data do contato', 'contato_data')}
          </Secao>

          <Secao label="Visita agendada" on={f.visita_agendada} onToggle={() => set('visita_agendada', !f.visita_agendada)}>
            {campoTexto('Quem marcou', 'visita_agendada_por', 'Nome')}
            {campoData('Data da visita', 'visita_casa_data')}
            <div className="sm:col-span-2">
              <Toggle label="Visita já realizada" on={f.visita_casa_feita} onToggle={() => set('visita_casa_feita', !f.visita_casa_feita)} />
            </div>
          </Secao>

          <Secao label="Voltou ao culto" on={f.voltou_culto} onToggle={() => set('voltou_culto', !f.voltou_culto)}>
            {campoData('Data em que voltou', 'voltou_culto_data')}
          </Secao>

          <Secao label="Vai ser discipulado(a)" on={f.discipulado} onToggle={() => set('discipulado', !f.discipulado)}>
            {campoData('Início do discipulado', 'discipulado_inicio')}
            {campoTexto('Quem vai discipular', 'discipulador', 'Nome')}
          </Secao>

          <div className="space-y-3 rounded-lg border p-3">
            <Toggle label="Já é batizado(a)" on={f.batizado} onToggle={() => set('batizado', !f.batizado)} />
            <div className="space-y-1">
              <Label className="text-xs">Já congrega em outro lugar? Qual</Label>
              <Input value={f.congregacao_origem} onChange={e => set('congregacao_origem', e.target.value)} placeholder="Ex.: outra igreja / congregação" className="h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Observações do acompanhamento</Label>
              <Textarea value={f.observacoes} onChange={e => set('observacoes', e.target.value)} rows={3} placeholder="Anotações do acompanhamento..." />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button onClick={salvar} disabled={saving || !f.nome.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
