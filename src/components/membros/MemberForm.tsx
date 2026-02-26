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
  const [todosMembros, setTodosMembros] = useState<{ id: number; nome: string }[]>([])
  const [familiarDropdownIdx, setFamiliarDropdownIdx] = useState<number | null>(null)

  // Carregar lista de membros para busca de familiares e verificação de duplicados
  useEffect(() => {
    if (!token) return
    fetch('/api/membros', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then((data: { id: number; nome: string }[]) => {
        if (Array.isArray(data)) setTodosMembros(data.map(m => ({ id: m.id, nome: m.nome })))
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
        setForm({
          ...defaultForm,
          ...rest,
          historicos: data.historicos || [],
          familiares: data.familiares || [],
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

  const vincularFamiliar = (i: number, membro: { id: number; nome: string }) => {
    setForm(f => ({
      ...f,
      familiares: f.familiares.map((fam, idx) => idx === i
        ? { ...fam, nome: membro.nome, membro_vinculado_id: membro.id }
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
  const duplicados = nomeTrimmed.length > 2
    ? todosMembros.filter(m => m.id !== membroId && m.nome.trim().toLowerCase() === nomeTrimmed)
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

  const field = (label: string, fieldName: keyof MemberFormData, type = 'text', col?: string) => (
    <div className={`space-y-2 ${col || ''}`}>
      <Label>{label}</Label>
      <Input
        type={type}
        value={String(form[fieldName] ?? '')}
        onChange={e => set(fieldName, e.target.value)}
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
            <Input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Nome completo" required />
            {duplicados.length > 0 && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-md px-3 py-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>Já existe um membro com este nome: <strong>{duplicados[0].nome}</strong></span>
              </div>
            )}
          </div>
          {field('Conhecido Como', 'conhecido_como')}
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
          {field('Igreja', 'igreja')}
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
            <Input value={form.logradouro || ''} onChange={e => set('logradouro', e.target.value)} placeholder="Rua, Av..." />
          </div>
          {field('Número', 'numero')}
          {field('Complemento', 'complemento')}
          {field('Bairro', 'bairro')}
          {field('Cidade', 'cidade')}
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
        </CardContent>
      </Card>

      {/* Outros */}
      <Card>
        <CardHeader><CardTitle className="text-base">Dados Complementares</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {field('Profissão', 'profissao')}
          {selectField('Grau de Instrução', 'grau_instrucao', [
            'Fundamental Incompleto', 'Fundamental Completo', 'Médio Incompleto', 'Médio Completo',
            'Superior Incompleto', 'Superior Completo', 'Pós-graduação', 'Mestrado', 'Doutorado',
          ])}
          {field('Naturalidade', 'naturalidade')}
          {field('UF Naturalidade', 'uf_naturalidade')}
          {field('Nacionalidade', 'nacionalidade')}
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
                                onClick={() => router.push(`/membros/novo?nome=${encodeURIComponent(f.nome.trim())}`)}
                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-primary hover:bg-accent border-t border-border"
                              >
                                <UserPlus className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">Cadastrar &quot;{f.nome.trim()}&quot; como novo membro</span>
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
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {membroId ? 'Salvar Alterações' : 'Cadastrar Membro'}
        </Button>
      </div>
    </form>
  )
}
