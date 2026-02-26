"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Membro, Historico, Familiar, Departamento } from '@/types'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Plus, Trash2, Search, X, AlertTriangle, UserPlus } from 'lucide-react'
import { CARGOS_ECLESIASTICOS, CARGOS_DEPARTAMENTO } from '@/lib/constants'

type DeptSelecao = { id: number; nome: string; cargo_departamento: string }

type MemberFormData = Omit<Membro, 'id' | 'created_at' | 'updated_at' | 'departamentos_info'> & {
  historicos: Historico[]
  familiares: Familiar[]
}

const defaultForm: MemberFormData = {
  nome: '', conhecido_como: '', igreja: '', cargo: '', sexo: '',
  data_nascimento: '', cep: '', logradouro: '', numero: '', complemento: '',
  bairro: '', cidade: '', estado: '', telefone_principal: '', telefone_secundario: '',
  email: '', cpf: '', estado_civil: '', profissao: '', identidade: '',
  orgao_expedidor: '', data_expedicao: '', grau_instrucao: '', titulo_eleitor: '',
  titulo_eleitor_zona: '', titulo_eleitor_secao: '', tipo_sanguineo: '',
  cert_nascimento_casamento: '', reservista: '', carteira_motorista: '',
  chefe_familiar: false, data_casamento: '', naturalidade: '', uf_naturalidade: '',
  nacionalidade: 'Brasileira', origem_religiosa: '', tipo_participante: 'Membro',
  informacoes_complementares: '', funcao_igreja: '',
  historicos: [], familiares: [],
}

interface Props {
  membroId?: number
  initialNome?: string
  onSuccess?: () => void
  onCancel?: () => void
}

export function MemberForm({ membroId, initialNome, onSuccess, onCancel }: Props) {
  const router = useRouter()
  const { token } = useAuth()
  const { toast } = useToast()
  const [form, setForm] = useState<MemberFormData>({ ...defaultForm, nome: initialNome || '' })
  const [loading, setLoading] = useState(!!membroId)
  const [saving, setSaving] = useState(false)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [departamentosDisponiveis, setDepartamentosDisponiveis] = useState<Departamento[]>([])
  const [deptosSelecionados, setDeptosSelecionados] = useState<DeptSelecao[]>([])
  const [congregacoes, setCongregacoes] = useState<{ id: number; nome: string }[]>([])
  const [todosMembros, setTodosMembros] = useState<{ id: number; nome: string; data_nascimento?: string }[]>([])
  const [familiarDropdownIdx, setFamiliarDropdownIdx] = useState<number | null>(null)
  const [quickReg, setQuickReg] = useState<{
    idx: number; nome: string; parentesco: string
    sexo: string; tipo_participante: string; data_nascimento: string; cargo: string
  } | null>(null)
  const [quickRegSaving, setQuickRegSaving] = useState(false)

  // Carregar lista de membros para busca de familiares e verificação de duplicados
  useEffect(() => {
    if (!token) return
    fetch('/api/membros', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: { id: number; nome: string; data_nascimento?: string }[]) => {
        if (Array.isArray(data)) setTodosMembros(data.map(m => ({ id: m.id, nome: m.nome, data_nascimento: m.data_nascimento })))
      })
      .catch(() => {})
  }, [token])

  // Carregar departamentos disponíveis
  useEffect(() => {
    if (!token) return
    fetch('/api/departamentos', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setDepartamentosDisponiveis(data) : [])
      .catch(() => {})
  }, [token])

  // Carregar congregações disponíveis
  useEffect(() => {
    if (!token) return
    fetch('/api/congregacoes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => Array.isArray(data) ? setCongregacoes(data.map((c: { id: number; nome: string }) => ({ id: c.id, nome: c.nome }))) : [])
      .catch(() => {})
  }, [token])

  // Carregar dados do membro (edição)
  useEffect(() => {
    if (!membroId || !token) return
    fetch(`/api/membros/${membroId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: Membro & { historicos: Historico[]; familiares: Familiar[]; departamentos?: DeptSelecao[] }) => {
        const { id, created_at, updated_at, departamentos_info, departamentos: depts, ...rest } = data as typeof data & {
          id: number; created_at?: string; updated_at?: string
          departamentos_info?: unknown; departamentos?: DeptSelecao[]
        }
        void id; void created_at; void updated_at; void departamentos_info
        // Normaliza datas para o formato YYYY-MM-DD esperado pelo <input type="date">
        const d = (v: unknown): string => v ? String(v).split('T')[0] : ''
        setForm({
          ...defaultForm,
          ...rest,
          data_nascimento: d(rest.data_nascimento),
          data_casamento: d(rest.data_casamento),
          data_expedicao: d(rest.data_expedicao),
          historicos: (data.historicos || []).map((h: Historico) => ({ ...h, data: d(h.data) })),
          familiares: (data.familiares || []).map((f: Familiar) => ({ ...f, data_nascimento: d(f.data_nascimento) })),
        })
        setDeptosSelecionados(
          (depts || []).map(d => ({
            id: d.id,
            nome: d.nome,
            cargo_departamento: d.cargo_departamento || '',
          }))
        )
      })
      .finally(() => setLoading(false))
  }, [membroId, token])

  const set = (field: keyof MemberFormData, value: unknown) => {
    setForm(f => ({ ...f, [field]: value }))
  }

  const buscarCep = async () => {
    const cep = form.cep?.replace(/\D/g, '')
    if (!cep || cep.length !== 8) return
    setBuscandoCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setForm(f => ({
          ...f,
          logradouro: data.logradouro || f.logradouro,
          bairro: data.bairro || f.bairro,
          cidade: data.localidade || f.cidade,
          estado: data.uf || f.estado,
        }))
      }
    } catch {
      toast({ title: 'Erro ao buscar CEP.', variant: 'destructive' })
    } finally {
      setBuscandoCep(false)
    }
  }

  // ─── Histórico ────────────────────────────────────────────────────────────

  const addHistorico = () => {
    setForm(f => ({ ...f, historicos: [...f.historicos, { tipo: '', data: '', localidade: '', observacoes: '' }] }))
  }

  const removeHistorico = (i: number) => {
    setForm(f => ({ ...f, historicos: f.historicos.filter((_, idx) => idx !== i) }))
  }

  const setHistorico = (i: number, field: keyof Historico, value: string) => {
    setForm(f => ({
      ...f,
      historicos: f.historicos.map((h, idx) => idx === i ? { ...h, [field]: value } : h),
    }))
  }

  // ─── Familiares ───────────────────────────────────────────────────────────

  const addFamiliar = () => {
    setForm(f => ({ ...f, familiares: [...f.familiares, { parentesco: '', nome: '', data_nascimento: '', observacoes: '' }] }))
  }

  const removeFamiliar = (i: number) => {
    setForm(f => ({ ...f, familiares: f.familiares.filter((_, idx) => idx !== i) }))
    if (familiarDropdownIdx === i) setFamiliarDropdownIdx(null)
  }

  const setFamiliar = (i: number, field: keyof Familiar, value: string) => {
    setForm(f => ({
      ...f,
      familiares: f.familiares.map((fam, idx) => idx === i ? { ...fam, [field]: value } : fam),
    }))
  }

  const vincularFamiliar = (i: number, membro: { id: number; nome: string; data_nascimento?: string }) => {
    setForm(f => ({
      ...f,
      familiares: f.familiares.map((fam, idx) => idx === i
        ? { ...fam, nome: membro.nome, membro_vinculado_id: membro.id, data_nascimento: membro.data_nascimento || fam.data_nascimento }
        : fam
      ),
    }))
    setFamiliarDropdownIdx(null)
  }

  const desvincularFamiliar = (i: number) => {
    setForm(f => ({
      ...f,
      familiares: f.familiares.map((fam, idx) => idx === i
        ? { ...fam, membro_vinculado_id: undefined }
        : fam
      ),
    }))
  }

  // ─── Pré-cadastro rápido de familiar ──────────────────────────────────────

  const sexoPorParentesco = (parentesco: string, sexoPrincipal: string): string => {
    if (parentesco === 'Cônjuge') return sexoPrincipal === 'Masculino' ? 'Feminino' : sexoPrincipal === 'Feminino' ? 'Masculino' : ''
    if (parentesco === 'Pai') return 'Masculino'
    if (parentesco === 'Mãe') return 'Feminino'
    return ''
  }

  const abrirQuickReg = (idx: number) => {
    const fam = form.familiares[idx]
    setQuickReg({
      idx,
      nome: fam.nome.trim(),
      parentesco: fam.parentesco,
      sexo: sexoPorParentesco(fam.parentesco, form.sexo || ''),
      tipo_participante: form.tipo_participante || 'Congregado',
      data_nascimento: '',
      cargo: '',
    })
    setFamiliarDropdownIdx(null)
  }

  const salvarQuickReg = async () => {
    if (!quickReg || !quickReg.nome.trim()) return
    setQuickRegSaving(true)
    try {
      const payload = {
        nome: quickReg.nome.trim(),
        tipo_participante: quickReg.tipo_participante,
        sexo: quickReg.sexo || null,
        cargo: quickReg.cargo || null,
        data_nascimento: quickReg.data_nascimento || null,
        // Herança do membro principal
        telefone_principal: form.telefone_principal || null,
        logradouro: form.logradouro || null,
        numero: form.numero || null,
        complemento: form.complemento || null,
        bairro: form.bairro || null,
        cidade: form.cidade || null,
        estado: form.estado || null,
        cep: form.cep || null,
        igreja: form.igreja || null,
        historicos: [],
        familiares: [],
      }
      const res = await fetch('/api/membros', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) {
        toast({ title: data.error || 'Erro ao cadastrar familiar.', variant: 'destructive' })
        return
      }
      vincularFamiliar(quickReg.idx, {
        id: data.id,
        nome: quickReg.nome.trim(),
        data_nascimento: quickReg.data_nascimento || undefined,
      })
      setTodosMembros(prev => [...prev, {
        id: data.id,
        nome: quickReg.nome.trim(),
        data_nascimento: quickReg.data_nascimento || undefined,
      }])
      toast({ title: `${quickReg.nome} cadastrado(a) e vinculado(a)!` })
      setQuickReg(null)
    } finally {
      setQuickRegSaving(false)
    }
  }

  // ─── Departamentos ────────────────────────────────────────────────────────

  const toggleDepartamento = (d: Departamento, checked: boolean) => {
    if (checked) {
      setDeptosSelecionados(prev => [...prev, { id: d.id, nome: d.nome, cargo_departamento: '' }])
    } else {
      setDeptosSelecionados(prev => prev.filter(s => s.id !== d.id))
    }
  }

  const setCargoDept = (id: number, cargo: string) => {
    setDeptosSelecionados(prev => prev.map(s => s.id === id ? { ...s, cargo_departamento: cargo } : s))
  }

  // ─── Verificação de duplicados ────────────────────────────────────────────

  const nomeTrimmed = form.nome.trim().toLowerCase()
  // Só verifica duplicado ao criar novo membro — não faz sentido ao editar
  const duplicados = !membroId && nomeTrimmed.length > 2
    ? todosMembros.filter(m => m.nome.trim().toLowerCase() === nomeTrimmed)
    : []

  // ─── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome.trim()) {
      toast({ title: 'Nome é obrigatório.', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const url = membroId ? `/api/membros/${membroId}` : '/api/membros'
      const method = membroId ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          departamentos: deptosSelecionados.map(d => ({
            id: d.id,
            cargo_departamento: d.cargo_departamento || null,
          })),
        }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast({ title: data.error, variant: 'destructive' })
        return
      }

      toast({ title: membroId ? 'Membro atualizado!' : 'Membro cadastrado!' })
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/membros')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      router.push('/membros')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const titleCase = (v: string) =>
    v.trim().replace(/\b\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())

  const field = (label: string, fieldName: keyof MemberFormData, type = 'text', col?: string, cap?: boolean) => (
    <div className={`space-y-2 ${col || ''}`}>
      <Label>{label}</Label>
      <Input
        type={type}
        value={String(form[fieldName] ?? '')}
        onChange={e => set(fieldName, e.target.value)}
        onBlur={cap ? (e: React.FocusEvent<HTMLInputElement>) => {
          const v = e.target.value.trim()
          if (v) set(fieldName, titleCase(v))
        } : undefined}
        placeholder={label}
      />
    </div>
  )

  const selectField = (label: string, fieldName: keyof MemberFormData, options: string[], col?: string) => (
    <div className={`space-y-2 ${col || ''}`}>
      <Label>{label}</Label>
      <select
        value={String(form[fieldName] ?? '')}
        onChange={e => set(fieldName, e.target.value)}
        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Selecione...</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Identificação */}
      <Card>
        <CardHeader><CardTitle className="text-base">Identificação</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label>Nome Completo *</Label>
            <Input
              value={form.nome}
              onChange={e => set('nome', e.target.value)}
              onBlur={e => { const v = e.target.value.trim(); if (v) set('nome', titleCase(v)) }}
              placeholder="Nome completo"
              required
            />
            {duplicados.length > 0 && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-md px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Já existe um membro com este nome: <strong>{duplicados[0].nome}</strong></span>
              </div>
            )}
          </div>
          {field('Conhecido Como', 'conhecido_como', 'text', undefined, true)}
          {selectField('Tipo de Participante', 'tipo_participante', ['Membro', 'Congregado', 'Visitante'])}
          {selectField('Sexo', 'sexo', ['Masculino', 'Feminino'])}
          {field('Data de Nascimento', 'data_nascimento', 'date')}
          {selectField('Estado Civil', 'estado_civil', ['Solteiro(a)', 'Casado(a)', 'Divorciado(a)', 'Viúvo(a)', 'Separado(a)', 'União Estável'])}
          {field('Data de Casamento', 'data_casamento', 'date')}
          <div className="flex items-center gap-2 pt-6">
            <input
              type="checkbox"
              id="chefe_familiar"
              checked={!!form.chefe_familiar}
              onChange={e => set('chefe_familiar', e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="chefe_familiar" className="text-sm">Chefe de família</label>
          </div>
        </CardContent>
      </Card>

      {/* Eclesiástico */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dados Eclesiásticos</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Congregação — select se houver cadastradas, input livre caso contrário */}
          <div className="space-y-2">
            <Label>Congregação</Label>
            {congregacoes.length > 0 ? (
              <select
                value={form.igreja || ''}
                onChange={e => set('igreja', e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione...</option>
                {congregacoes.map(c => (
                  <option key={c.id} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            ) : (
              <Input
                value={form.igreja || ''}
                onChange={e => set('igreja', e.target.value)}
                placeholder="Congregação"
              />
            )}
          </div>
          {selectField('Cargo', 'cargo', CARGOS_ECLESIASTICOS)}
          {field('Função na Igreja', 'funcao_igreja')}
          {field('Origem Religiosa', 'origem_religiosa')}
        </CardContent>
      </Card>

      {/* Contato */}
      <Card>
        <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {field('Telefone Principal', 'telefone_principal', 'tel')}
          {field('Telefone Secundário', 'telefone_secundario', 'tel')}
          {field('E-mail', 'email', 'email')}
        </CardContent>
      </Card>

      {/* Endereço */}
      <Card>
        <CardHeader><CardTitle className="text-base">Endereço</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>CEP</Label>
            <div className="flex gap-2">
              <Input
                value={form.cep || ''}
                onChange={e => set('cep', e.target.value)}
                onBlur={buscarCep}
                placeholder="00000-000"
                maxLength={9}
              />
              <Button type="button" variant="outline" size="icon" onClick={buscarCep} disabled={buscandoCep}>
                {buscandoCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Logradouro</Label>
            <Input
              value={form.logradouro || ''}
              onChange={e => set('logradouro', e.target.value)}
              onBlur={e => { const v = e.target.value.trim(); if (v) set('logradouro', titleCase(v)) }}
              placeholder="Rua, Av..."
            />
          </div>
          {field('Número', 'numero')}
          {field('Complemento', 'complemento', 'text', undefined, true)}
          {field('Bairro', 'bairro', 'text', undefined, true)}
          {field('Cidade', 'cidade', 'text', undefined, true)}
          {field('Estado (UF)', 'estado')}
        </CardContent>
      </Card>

      {/* Documentos */}
      <Card>
        <CardHeader><CardTitle className="text-base">Documentos</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {field('CPF', 'cpf')}
          {field('RG / Identidade', 'identidade')}
          {field('Órgão Expedidor', 'orgao_expedidor')}
          {field('Data de Expedição', 'data_expedicao', 'date')}
          {field('Título de Eleitor', 'titulo_eleitor')}
          {field('Zona', 'titulo_eleitor_zona')}
          {field('Seção', 'titulo_eleitor_secao')}
          {field('Certidão Nasc/Casamento', 'cert_nascimento_casamento')}
          {field('Reservista', 'reservista')}
          {field('CNH', 'carteira_motorista')}
          {selectField('Tipo Sanguíneo', 'tipo_sanguineo', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])}
          {field('Naturalidade', 'naturalidade', 'text', undefined, true)}
          {field('UF Naturalidade', 'uf_naturalidade')}
          {field('Nacionalidade', 'nacionalidade', 'text', undefined, true)}
        </CardContent>
      </Card>

      {/* Outros */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dados Complementares</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {field('Profissão', 'profissao', 'text', undefined, true)}
          {selectField('Grau de Instrução', 'grau_instrucao', [
            'Fundamental Incompleto', 'Fundamental Completo', 'Médio Incompleto', 'Médio Completo',
            'Superior Incompleto', 'Superior Completo', 'Pós-graduação', 'Mestrado', 'Doutorado',
          ])}
          <div className="space-y-2 sm:col-span-2 lg:col-span-3">
            <Label>Informações Complementares</Label>
            <Textarea
              value={form.informacoes_complementares || ''}
              onChange={e => set('informacoes_complementares', e.target.value)}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Departamentos */}
      {departamentosDisponiveis.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Departamentos</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {departamentosDisponiveis.map(d => {
                const sel = deptosSelecionados.find(s => s.id === d.id)
                const checked = !!sel
                return (
                  <div
                    key={d.id}
                    className={`border rounded-lg p-3 space-y-2 transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border'}`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`dept-${d.id}`}
                        checked={checked}
                        onChange={e => toggleDepartamento(d, e.target.checked)}
                        className="h-4 w-4 accent-primary"
                      />
                      <label htmlFor={`dept-${d.id}`} className="text-sm font-medium cursor-pointer select-none">
                        {d.nome}
                      </label>
                    </div>
                    {checked && (
                      <select
                        value={sel?.cargo_departamento || ''}
                        onChange={e => setCargoDept(d.id, e.target.value)}
                        className="w-full h-8 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="">Cargo (opcional)</option>
                        {CARGOS_DEPARTAMENTO.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico Eclesiástico */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Histórico Eclesiástico</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addHistorico}>
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.historicos.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum histórico adicionado.</p>
          )}
          {form.historicos.map((h, i) => (
            <div key={i} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 border rounded-lg">
              <div className="space-y-1">
                <Label className="text-xs">Tipo</Label>
                <select
                  value={h.tipo}
                  onChange={e => setHistorico(i, 'tipo', e.target.value)}
                  className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                >
                  <option value="">Selecione</option>
                  {['Batismo', 'Admissão', 'Exclusão', 'Transferência', 'Reconciliação', 'Ordenação', 'Afastamento'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data</Label>
                <Input type="date" value={h.data || ''} onChange={e => setHistorico(i, 'data', e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Localidade</Label>
                <Input value={h.localidade || ''} onChange={e => setHistorico(i, 'localidade', e.target.value)} placeholder="Cidade/Igreja" className="h-9" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Observações</Label>
                <div className="flex gap-2">
                  <Input value={h.observacoes || ''} onChange={e => setHistorico(i, 'observacoes', e.target.value)} placeholder="Obs." className="h-9" />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeHistorico(i)} className="h-9 w-9 text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Familiares */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Familiares</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addFamiliar}>
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {form.familiares.length === 0 && (
            <p className="text-sm text-muted-foreground">Nenhum familiar adicionado.</p>
          )}
          {form.familiares.map((f, i) => {
            const resultados = familiarDropdownIdx === i && f.nome.trim().length > 1
              ? todosMembros
                  .filter(m => m.id !== membroId && m.nome.toLowerCase().includes(f.nome.toLowerCase()))
                  .slice(0, 6)
              : []
            const hasExactMatch = resultados.some(m => m.nome.toLowerCase() === f.nome.toLowerCase().trim())
            const showCadastrar = f.nome.trim().length > 2 && !hasExactMatch
            const showDropdown = familiarDropdownIdx === i && (resultados.length > 0 || showCadastrar)

            return (
              <div key={i} className="p-3 border rounded-lg space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Parentesco */}
                  <div className="space-y-1">
                    <Label className="text-xs">Parentesco</Label>
                    <select
                      value={f.parentesco}
                      onChange={e => setFamiliar(i, 'parentesco', e.target.value)}
                      className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="">Selecione</option>
                      {['Cônjuge', 'Filho(a)', 'Pai', 'Mãe', 'Irmão(ã)', 'Avô/Avó', 'Neto(a)', 'Outro'].map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Nome — vinculado ou busca */}
                  <div className="space-y-1">
                    <Label className="text-xs">Nome</Label>
                    {f.membro_vinculado_id ? (
                      <div className="h-9 flex items-center gap-2 px-3 rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20">
                        <span className="flex-1 text-sm text-emerald-800 dark:text-emerald-200 truncate">{f.nome}</span>
                        <button
                          type="button"
                          onClick={() => desvincularFamiliar(i)}
                          className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-100 shrink-0"
                          title="Desvincular membro"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <Input
                          value={f.nome}
                          onChange={e => {
                            setFamiliar(i, 'nome', e.target.value)
                            setFamiliarDropdownIdx(e.target.value.trim().length > 1 ? i : null)
                          }}
                          onFocus={() => { if (f.nome.trim().length > 1) setFamiliarDropdownIdx(i) }}
                          onBlur={() => setFamiliarDropdownIdx(null)}
                          placeholder="Nome ou buscar membro cadastrado"
                          className="h-9"
                        />
                        {showDropdown && (
                          <div
                            className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg overflow-hidden"
                            onMouseDown={e => e.preventDefault()}
                          >
                            {resultados.map(m => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => vincularFamiliar(i, m)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center gap-2"
                              >
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                                  {m.nome[0]}
                                </div>
                                <span className="truncate">{m.nome}</span>
                              </button>
                            ))}
                            {showCadastrar && (
                              <button
                                type="button"
                                onClick={() => abrirQuickReg(i)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-accent border-t border-border"
                              >
                                <UserPlus className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">Cadastrar &quot;{f.nome.trim()}&quot; como familiar</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Data de nascimento + Obs + Remover */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Data Nascimento</Label>
                    <Input type="date" value={f.data_nascimento || ''} onChange={e => setFamiliar(i, 'data_nascimento', e.target.value)} className="h-9" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Observações</Label>
                    <div className="flex gap-2">
                      <Input value={f.observacoes || ''} onChange={e => setFamiliar(i, 'observacoes', e.target.value)} placeholder="Obs." className="h-9" />
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeFamiliar(i)} className="h-9 w-9 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Botões */}
      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={handleCancel}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={saving || duplicados.length > 0}
          title={duplicados.length > 0 ? 'Corrija o nome duplicado antes de salvar' : undefined}
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {membroId ? 'Salvar Alterações' : 'Cadastrar Membro'}
        </Button>
      </div>

      {/* ── Modal de pré-cadastro rápido de familiar ── */}
      {quickReg && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
          onClick={() => { if (!quickRegSaving) setQuickReg(null) }}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div>
              <h2 className="text-lg font-semibold">Pré-cadastro de Familiar</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Cadastro rápido — telefone, endereço e igreja serão herdados automaticamente.
              </p>
            </div>

            {/* Campos editáveis */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome Completo *</Label>
                <Input
                  value={quickReg.nome}
                  onChange={e => setQuickReg(q => q ? { ...q, nome: e.target.value } : null)}
                  placeholder="Nome completo"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Tipo de Participante</Label>
                  <select
                    value={quickReg.tipo_participante}
                    onChange={e => setQuickReg(q => q ? { ...q, tipo_participante: e.target.value } : null)}
                    className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {['Membro', 'Congregado', 'Visitante'].map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sexo</Label>
                  <select
                    value={quickReg.sexo}
                    onChange={e => setQuickReg(q => q ? { ...q, sexo: e.target.value } : null)}
                    className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Selecione</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Feminino">Feminino</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Cargo (opcional)</Label>
                <select
                  value={quickReg.cargo}
                  onChange={e => setQuickReg(q => q ? { ...q, cargo: e.target.value } : null)}
                  className="w-full h-9 px-2 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Sem cargo</option>
                  {CARGOS_ECLESIASTICOS.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Data de Nascimento (opcional)</Label>
                <Input
                  type="date"
                  value={quickReg.data_nascimento}
                  onChange={e => {
                    const dn = e.target.value
                    // Menores de 12 anos → Congregado automaticamente
                    let tipoAuto = quickReg?.tipo_participante
                    if (dn) {
                      const [y, m, d] = dn.split('-').map(Number)
                      const nasc = new Date(y, m - 1, d)
                      const hoje = new Date()
                      let age = hoje.getFullYear() - nasc.getFullYear()
                      if (hoje.getMonth() < nasc.getMonth() || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) age--
                      if (age < 12) tipoAuto = 'Congregado'
                    }
                    setQuickReg(q => q ? { ...q, data_nascimento: dn, tipo_participante: tipoAuto ?? q.tipo_participante } : null)
                  }}
                />
              </div>

              {/* Preview dos dados herdados */}
              {(form.telefone_principal || form.logradouro || form.igreja) && (
                <div className="rounded-lg bg-muted/40 border border-border/50 px-3 py-2.5 space-y-1.5">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Herdado automaticamente
                  </p>
                  {form.telefone_principal && (
                    <p className="text-xs text-muted-foreground">📱 {form.telefone_principal}</p>
                  )}
                  {form.logradouro && (
                    <p className="text-xs text-muted-foreground">
                      📍 {[form.logradouro, form.numero, form.bairro, form.cidade, form.estado].filter(Boolean).join(', ')}
                    </p>
                  )}
                  {form.igreja && (
                    <p className="text-xs text-muted-foreground">⛪ {form.igreja}</p>
                  )}
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="flex justify-end gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setQuickReg(null)}
                disabled={quickRegSaving}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={salvarQuickReg}
                disabled={quickRegSaving || !quickReg.nome.trim()}
              >
                {quickRegSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Cadastrar e Vincular
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
