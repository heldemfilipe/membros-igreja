"use client"

import { useState, useEffect } from 'react'
import { Membro, VisitaRecente } from '@/types'
import { calcularIdade, formatarData } from '@/lib/utils'
import { getCargoStyle, getDeptBadgeStyle } from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Phone, MapPin, Calendar, Pencil, Mail, CalendarDays, Plus, Loader2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'

const TIPO_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  Membro: 'default',
  Congregado: 'secondary',
  Visitante: 'outline',
}

function hoje(): string {
  return new Date().toISOString().split('T')[0]
}

interface Props {
  membro: Membro | null
  open: boolean
  onClose: () => void
  onEdit?: (id: number) => void
  onVisitaRegistrada?: () => void
}

export function MemberViewModal({ membro, open, onClose, onEdit, onVisitaRegistrada }: Props) {
  const { token } = useAuth()
  const { toast } = useToast()
  const [visitas, setVisitas] = useState<VisitaRecente[]>([])
  const [showNovaVisita, setShowNovaVisita] = useState(false)
  const [dataVisita, setDataVisita] = useState(hoje())
  const [obsVisita, setObsVisita] = useState('')
  const [savingVisita, setSavingVisita] = useState(false)

  useEffect(() => {
    if (!membro || membro.tipo_participante !== 'Visitante' || !open || !token) return
    fetch(`/api/visitas?membro_id=${membro.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : [])
      .then(setVisitas)
      .catch(() => {})
  }, [membro, open, token])

  useEffect(() => {
    if (!open) {
      setShowNovaVisita(false)
      setDataVisita(hoje())
      setObsVisita('')
      setVisitas([])
    }
  }, [open])

  const handleRegistrarVisita = async () => {
    if (!membro) return
    setSavingVisita(true)
    try {
      const res = await fetch('/api/visitas', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ membro_id: membro.id, data_visita: dataVisita, observacoes: obsVisita }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: data.error || 'Erro ao registrar.', variant: 'destructive' })
        return
      }
      toast({ title: '✓ Visita registrada!' })
      setShowNovaVisita(false)
      setObsVisita('')
      // Recarrega visitas
      const r = await fetch(`/api/visitas?membro_id=${membro.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (r.ok) setVisitas(await r.json())
      onVisitaRegistrada?.()
    } finally {
      setSavingVisita(false)
    }
  }

  if (!membro) return null

  const idade = calcularIdade(membro.data_nascimento || null)
  const isVisitante = membro.tipo_participante === 'Visitante'

  const infoRows = [
    membro.data_nascimento && {
      icon: Calendar,
      label: 'Nascimento',
      value: `${formatarData(membro.data_nascimento)}${idade !== null ? ` (${idade} anos)` : ''}`,
    },
    membro.estado_civil && { icon: null, label: 'Estado Civil', value: membro.estado_civil },
    membro.profissao && { icon: null, label: 'Profissão', value: membro.profissao },
    membro.telefone_principal && {
      icon: Phone,
      label: 'Telefone',
      value: [membro.telefone_principal, membro.telefone_secundario].filter(Boolean).join(' / '),
      href: `tel:${membro.telefone_principal}`,
    },
    membro.email && {
      icon: Mail,
      label: 'E-mail',
      value: membro.email,
      href: `mailto:${membro.email}`,
    },
    (membro.cidade || membro.logradouro) && {
      icon: MapPin,
      label: 'Endereço',
      value: [
        membro.logradouro, membro.numero, membro.complemento,
        membro.bairro, membro.cidade, membro.estado,
      ].filter(Boolean).join(', '),
    },
    membro.origem_religiosa && { icon: null, label: 'Origem Religiosa', value: membro.origem_religiosa },
    membro.igreja && { icon: null, label: 'Igreja', value: membro.igreja },
  ].filter(Boolean) as {
    icon: React.ElementType | null; label: string; value: string; href?: string
  }[]

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="pr-8 leading-snug">{membro.nome}</DialogTitle>
          {membro.conhecido_como && (
            <DialogDescription>Conhecido como: &quot;{membro.conhecido_como}&quot;</DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Badges */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant={TIPO_VARIANT[membro.tipo_participante] ?? 'outline'}>
              {membro.tipo_participante}
            </Badge>
            {membro.cargo && (
              <Badge style={getCargoStyle(membro.cargo)}>{membro.cargo}</Badge>
            )}
            {membro.sexo && <Badge variant="outline">{membro.sexo}</Badge>}
          </div>

          {/* Info rows */}
          <div className="space-y-2">
            {infoRows.map((row, i) => {
              const Icon = row.icon
              if (row.href) {
                return (
                  <a key={i} href={row.href} className="flex items-start gap-2 text-sm hover:text-primary transition-colors">
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
                    <div>
                      <span className="text-muted-foreground text-xs">{row.label}: </span>
                      <span>{row.value}</span>
                    </div>
                  </a>
                )
              }
              return (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {Icon
                    ? <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    : <div className="w-4 shrink-0" />
                  }
                  <div>
                    <span className="text-muted-foreground text-xs">{row.label}: </span>
                    <span>{row.value}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Departamentos */}
          {membro.departamentos_info && membro.departamentos_info.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1.5">Departamentos</p>
              <div className="flex flex-wrap gap-1.5">
                {membro.departamentos_info.map((d, i) => (
                  <Badge key={i} variant="outline" style={getDeptBadgeStyle(d.dept_id ?? d.dept_nome)}>
                    {d.dept_nome}{d.cargo_departamento ? ` · ${d.cargo_departamento}` : ''}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* ─── Histórico de Visitas (só para Visitantes) ─── */}
          {isVisitante && (
            <div className="border rounded-lg p-3 space-y-2.5 bg-muted/20">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Histórico de Visitas
                  {visitas.length > 0 && (
                    <span className="text-primary font-bold">{visitas.length}</span>
                  )}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => setShowNovaVisita(v => !v)}
                >
                  <Plus className="h-3 w-3" />
                  Registrar Visita
                </Button>
              </div>

              {/* Formulário nova visita */}
              {showNovaVisita && (
                <div className="space-y-2 pt-1 border-t">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Data da Visita</Label>
                      <Input
                        type="date"
                        value={dataVisita}
                        onChange={e => setDataVisita(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 shrink-0 text-xs gap-1"
                      onClick={() => setDataVisita(hoje())}
                    >
                      <CalendarDays className="h-3 w-3" />
                      Hoje
                    </Button>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Observação (opcional)</Label>
                    <Input
                      value={obsVisita}
                      onChange={e => setObsVisita(e.target.value)}
                      placeholder="Ex.: Culto de domingo..."
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowNovaVisita(false)}>
                      Cancelar
                    </Button>
                    <Button size="sm" className="h-7 text-xs" onClick={handleRegistrarVisita} disabled={savingVisita}>
                      {savingVisita && <Loader2 className="h-3 w-3 animate-spin" />}
                      Salvar
                    </Button>
                  </div>
                </div>
              )}

              {/* Lista de visitas */}
              {visitas.length === 0 && !showNovaVisita ? (
                <p className="text-xs text-muted-foreground">Nenhuma visita registrada.</p>
              ) : (
                <div className="space-y-1">
                  {visitas.map(v => (
                    <div key={v.id} className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/60 flex-shrink-0" />
                        {new Date(v.data_visita + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                      {v.observacoes && (
                        <span className="text-muted-foreground truncate max-w-[60%] text-right">
                          {v.observacoes}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Informações complementares */}
          {membro.informacoes_complementares && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Observações</p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {membro.informacoes_complementares}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
            Fechar
          </Button>
          {onEdit && (
            <Button className="w-full sm:w-auto" onClick={() => { onClose(); onEdit(membro.id) }}>
              <Pencil className="h-4 w-4" />
              {isVisitante ? 'Completar Cadastro' : 'Editar Cadastro'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
