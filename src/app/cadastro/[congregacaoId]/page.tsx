"use client"

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Church, Loader2, CheckCircle2, User, MapPin, GraduationCap, Sparkles,
  Cross, BookOpen, HeartHandshake, UserPlus, MessageSquare, X, Check, Search, FileText,
} from 'lucide-react'
import { DONS_TALENTOS, ORIGENS_RELIGIOSAS } from '@/lib/constants'
import type { FormularioPublicoConfig } from '@/types'

type Form = {
  nome: string
  telefone: string
  email: string
  data_nascimento: string
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  estado: string
  estado_civil: string
  data_casamento: string
  grau_instrucao: string
  profissao: string
  dons_talentos: string
  dons_desejados: string
  batizado_espirito_santo: boolean | null
  data_batismo_espirito_santo: string
  local_batismo_espirito_santo: string
  batizado_aguas: boolean | null
  data_batismo_aguas: string
  local_batismo_aguas: string
  vida_ministerial: string
  origem_religiosa: string
  origem_religiosa_detalhe: string
  tem_pacto: boolean | null
  observacao_religiosa: string
  cpf: string
  identidade: string
  tipo_sanguineo: string
  naturalidade: string
  uf_naturalidade: string
  desafios_pessoais: string
  convidado_por: string
  informacoes_complementares: string
}

const vazio: Form = {
  nome: '', telefone: '', email: '', data_nascimento: '',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  estado_civil: '', data_casamento: '', grau_instrucao: '', profissao: '',
  dons_talentos: '', dons_desejados: '',
  batizado_espirito_santo: null, data_batismo_espirito_santo: '', local_batismo_espirito_santo: '',
  batizado_aguas: null, data_batismo_aguas: '', local_batismo_aguas: '',
  vida_ministerial: '',
  origem_religiosa: '', origem_religiosa_detalhe: '',
  tem_pacto: null, observacao_religiosa: '',
  cpf: '', identidade: '', tipo_sanguineo: '', naturalidade: '', uf_naturalidade: '',
  desafios_pessoais: '', convidado_por: '', informacoes_complementares: '',
}

const maskCEP = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`
}
const maskCPF = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}
const maskRG = (v: string) => {
  const d = v.replace(/[^0-9Xx]/g, '').toUpperCase().slice(0, 9)
  if (d.length <= 2) return d
  if (d.length <= 5) return `${d.slice(0, 2)}.${d.slice(2)}`
  if (d.length <= 8) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${d.slice(8)}`
}

function Secao({ icon: Icon, titulo, children }: { icon: typeof User; titulo: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 font-semibold">
          <Icon className="h-4 w-4 text-primary shrink-0" />
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  )
}

function SimNao({ label, valor, onChange }: { label: string; valor: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-sm">{label}</span>
      <div className="flex gap-1.5 shrink-0">
        <button type="button" onClick={() => onChange(true)}
          className={`px-3 h-8 rounded-md text-xs font-medium border transition-colors ${
            valor === true ? 'bg-primary text-primary-foreground border-primary' : 'border-input text-muted-foreground hover:bg-accent'
          }`}>
          Sim
        </button>
        <button type="button" onClick={() => onChange(false)}
          className={`px-3 h-8 rounded-md text-xs font-medium border transition-colors ${
            valor === false ? 'bg-secondary text-secondary-foreground border-secondary' : 'border-input text-muted-foreground hover:bg-accent'
          }`}>
          Não
        </button>
      </div>
    </div>
  )
}

function DataLocal({ id, data, local, erro, onData, onLocal }: {
  id: string; data: string; local: string; erro?: string; onData: (v: string) => void; onLocal: (v: string) => void
}) {
  return (
    <div id={id} className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-1 -mt-1 pb-1">
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Quando? *</Label>
        <Input type="date" value={data} onChange={e => onData(e.target.value)}
          className={`h-10 ${erro ? 'border-red-500 focus-visible:ring-red-500' : ''}`} />
        {erro && <p className="text-xs text-red-500">{erro}</p>}
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs text-muted-foreground">Onde?</Label>
        <Input value={local} onChange={e => onLocal(e.target.value)} placeholder="Igreja, cidade..." className="h-10" />
      </div>
    </div>
  )
}

function Chips({ label, valor, onChange, placeholder }: {
  label: string; valor: string; onChange: (s: string) => void; placeholder: string
}) {
  const [input, setInput] = useState('')
  const atuais = valor.split(',').map(s => s.trim()).filter(Boolean)
  const disponiveis = DONS_TALENTOS.filter(d => !atuais.includes(d))
  const setLista = (arr: string[]) => onChange(arr.join(', '))
  const add = (d: string) => { const v = d.trim(); if (v && !atuais.includes(v)) setLista([...atuais, v]) }
  const remove = (d: string) => setLista(atuais.filter(x => x !== d))
  return (
    <div className="space-y-2">
      <Label className="text-sm">{label}</Label>
      {atuais.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {atuais.map(d => (
            <button key={d} type="button" onClick={() => remove(d)}
              className="px-2.5 py-1.5 rounded-full text-xs bg-primary text-primary-foreground inline-flex items-center gap-1 hover:bg-primary/90 transition-colors">
              {d} <X className="h-3 w-3" />
            </button>
          ))}
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {disponiveis.map(d => (
          <button key={d} type="button" onClick={() => add(d)}
            className="px-2.5 py-1.5 rounded-full text-xs border border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
            + {d}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(input); setInput('') } }}
          placeholder={placeholder} className="h-10" />
        <Button type="button" variant="outline" className="shrink-0" onClick={() => { add(input); setInput('') }}>
          Adicionar
        </Button>
      </div>
    </div>
  )
}

type Errors = Partial<Record<keyof Form, string>>

export default function CadastroPublicoPage() {
  const params = useParams<{ congregacaoId: string }>()
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [congId, setCongId] = useState<number | null>(null)
  const [congNome, setCongNome] = useState('')
  const [campos, setCampos] = useState<FormularioPublicoConfig | null>(null)
  const [form, setForm] = useState<Form>(vazio)
  const [erros, setErros] = useState<Errors>({})
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erroCampo, setErroCampo] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/publico/formulario/${params.congregacaoId}`)
      .then(async r => {
        if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || 'Link inválido.') }
        return r.json()
      })
      .then(data => { setCongId(data.congregacao?.id ?? null); setCongNome(data.congregacao?.nome || ''); setCampos(data.campos) })
      .catch(e => setErro(e.message || 'Não foi possível carregar este formulário.'))
      .finally(() => setCarregando(false))
  }, [params.congregacaoId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm(f => ({ ...f, [k]: v }))
    setErros(e => (e[k] ? { ...e, [k]: undefined } : e))
  }

  const buscarCep = async () => {
    const cep = form.cep.replace(/\D/g, '')
    if (cep.length !== 8) return
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
    } catch { /* ignore */ } finally {
      setBuscandoCep(false)
    }
  }

  const validar = (): Errors => {
    const e: Errors = {}
    if (!form.nome.trim()) e.nome = 'Informe seu nome completo.'
    if (!form.telefone.trim()) e.telefone = 'Informe um telefone para contato.'
    if ((form.estado_civil === 'Casado(a)' || form.estado_civil === 'União Estável') && !form.data_casamento) {
      e.data_casamento = 'Informe a data de casamento.'
    }
    if (form.batizado_espirito_santo === true && !form.data_batismo_espirito_santo) {
      e.data_batismo_espirito_santo = 'Informe quando foi batizado(a).'
    }
    if (form.batizado_aguas === true && !form.data_batismo_aguas) {
      e.data_batismo_aguas = 'Informe quando foi batizado(a).'
    }
    if (form.origem_religiosa === 'Outra' && !form.origem_religiosa_detalhe.trim()) {
      e.origem_religiosa_detalhe = 'Diga qual é a sua religião.'
    }
    return e
  }

  const enviar = async () => {
    const e = validar()
    setErros(e)
    const chaves = Object.keys(e)
    if (chaves.length > 0) {
      setErroCampo('Preencha os campos em vermelho para poder enviar.')
      document.getElementById(`campo-${chaves[0]}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    setErroCampo(null)
    setEnviando(true)
    try {
      const res = await fetch('/api/publico/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, congregacao_id: congId }),
      })
      const data = await res.json()
      if (!res.ok) { setErroCampo(data.error || 'Não foi possível enviar. Tente novamente.'); return }
      setEnviado(true)
    } catch {
      setErroCampo('Não foi possível enviar. Verifique sua conexão e tente de novo.')
    } finally {
      setEnviando(false)
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="text-center space-y-2 max-w-sm">
          <Church className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="font-medium">{erro}</p>
          <p className="text-sm text-muted-foreground">Confira o link com quem te enviou.</p>
        </div>
      </div>
    )
  }

  if (enviado) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
        <div className="text-center space-y-3 max-w-sm">
          <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
          <h1 className="text-xl font-bold">Cadastro enviado!</h1>
          <p className="text-sm text-muted-foreground">
            Obrigado por compartilhar isso com a gente, {form.nome.trim().split(/\s+/)[0]}.
            Em breve alguém da igreja vai entrar em contato.
          </p>
        </div>
      </div>
    )
  }

  const c = campos!

  return (
    <div className="min-h-screen bg-muted/30 py-6 px-4 sm:py-10">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="text-center space-y-2 mb-2">
          <div className="bg-primary p-3 rounded-2xl inline-flex mx-auto shadow-sm">
            <Church className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold">Cadastro</h1>
          {congNome && <p className="text-sm text-muted-foreground">{congNome}</p>}
        </div>

        <Secao icon={User} titulo="Seus dados">
          <div id="campo-nome" className="space-y-1.5">
            <Label className="text-sm">Nome completo *</Label>
            <Input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Seu nome completo"
              className={`h-11 ${erros.nome ? 'border-red-500 focus-visible:ring-red-500' : ''}`} autoFocus />
            {erros.nome && <p className="text-xs text-red-500">{erros.nome}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div id="campo-telefone" className="space-y-1.5">
              <Label className="text-sm">Telefone / WhatsApp *</Label>
              <Input type="tel" value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(00) 00000-0000"
                className={`h-11 ${erros.telefone ? 'border-red-500 focus-visible:ring-red-500' : ''}`} />
              {erros.telefone && <p className="text-xs text-red-500">{erros.telefone}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">E-mail</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="seuemail@exemplo.com" className="h-11" />
            </div>
          </div>
          {c.nascimento && (
            <div className="space-y-1.5">
              <Label className="text-sm">Data de nascimento</Label>
              <Input type="date" value={form.data_nascimento} onChange={e => set('data_nascimento', e.target.value)} className="h-11" />
            </div>
          )}
        </Secao>

        {c.endereco && (
          <Secao icon={MapPin} titulo="Endereço">
            <div className="space-y-1.5">
              <Label className="text-sm">CEP</Label>
              <div className="flex gap-2">
                <Input value={form.cep} onChange={e => set('cep', maskCEP(e.target.value))} onBlur={buscarCep}
                  placeholder="00000-000" maxLength={9} className="h-11" />
                <Button type="button" variant="outline" size="icon" className="h-11 w-11 shrink-0" onClick={buscarCep} disabled={buscandoCep}>
                  {buscandoCep ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-sm">Logradouro</Label>
                <Input value={form.logradouro} onChange={e => set('logradouro', e.target.value)} placeholder="Rua, Av..." className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Número</Label>
                <Input value={form.numero} onChange={e => set('numero', e.target.value)} className="h-11" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Complemento</Label>
                <Input value={form.complemento} onChange={e => set('complemento', e.target.value)} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Bairro</Label>
                <Input value={form.bairro} onChange={e => set('bairro', e.target.value)} className="h-11" />
              </div>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Cidade</Label>
                <Input value={form.cidade} onChange={e => set('cidade', e.target.value)} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">UF</Label>
                <Input value={form.estado} onChange={e => set('estado', e.target.value.toUpperCase().slice(0, 2))} maxLength={2} className="h-11 w-16" />
              </div>
            </div>
          </Secao>
        )}

        {c.documentos && (
          <Secao icon={FileText} titulo="Documentos">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">CPF</Label>
                <Input value={form.cpf} onChange={e => set('cpf', maskCPF(e.target.value))} placeholder="000.000.000-00" maxLength={14} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">RG / Identidade</Label>
                <Input value={form.identidade} onChange={e => set('identidade', maskRG(e.target.value))} placeholder="00.000.000-0" maxLength={12} className="h-11" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Tipo sanguíneo</Label>
              <select value={form.tipo_sanguineo} onChange={e => set('tipo_sanguineo', e.target.value)}
                className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione...</option>
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Naturalidade (cidade onde nasceu)</Label>
                <Input value={form.naturalidade} onChange={e => set('naturalidade', e.target.value)} className="h-11" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">UF</Label>
                <Input value={form.uf_naturalidade} onChange={e => set('uf_naturalidade', e.target.value.toUpperCase().slice(0, 2))} maxLength={2} className="h-11 w-16" />
              </div>
            </div>
          </Secao>
        )}

        {c.estado_civil && (
          <Secao icon={HeartHandshake} titulo="Estado civil">
            <div className="space-y-1.5">
              <Label className="text-sm">Estado civil</Label>
              <select
                value={form.estado_civil}
                onChange={e => {
                  const v = e.target.value
                  set('estado_civil', v)
                  if (v !== 'Casado(a)' && v !== 'União Estável') set('data_casamento', '')
                }}
                className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione...</option>
                {['Solteiro(a)', 'Casado(a)', 'União Estável', 'Divorciado(a)', 'Separado(a)', 'Viúvo(a)'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            {(form.estado_civil === 'Casado(a)' || form.estado_civil === 'União Estável') && (
              <div id="campo-data_casamento" className="space-y-1.5">
                <Label className="text-sm">Data de casamento *</Label>
                <Input type="date" value={form.data_casamento} onChange={e => set('data_casamento', e.target.value)}
                  className={`h-11 ${erros.data_casamento ? 'border-red-500 focus-visible:ring-red-500' : ''}`} />
                {erros.data_casamento && <p className="text-xs text-red-500">{erros.data_casamento}</p>}
              </div>
            )}
          </Secao>
        )}

        {c.escolaridade_area && (
          <Secao icon={GraduationCap} titulo="Formação e área de atuação">
            <div className="space-y-1.5">
              <Label className="text-sm">Formação escolar</Label>
              <select value={form.grau_instrucao} onChange={e => set('grau_instrucao', e.target.value)}
                className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione...</option>
                {['Fundamental', 'Médio', 'Superior', 'Pós-graduação'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Qual sua área de atuação / formação?</Label>
              <Input value={form.profissao} onChange={e => set('profissao', e.target.value)} placeholder="Ex.: Enfermagem, Pedreiro, Estudante..." className="h-11" />
            </div>
          </Secao>
        )}

        {c.dons_talentos && (
          <Secao icon={Sparkles} titulo="Dons e talentos">
            <p className="text-xs text-muted-foreground -mt-1">
              O que você sabe fazer bem? Cantar, tocar instrumento, fotografia, mídia social, construção,
              primeiros socorros, vendas, escrever bem, trabalhar com crianças ou idosos, obra social...
            </p>
            <Chips label="O que você já sabe fazer / seus dons" valor={form.dons_talentos}
              onChange={v => set('dons_talentos', v)} placeholder="Outro dom/talento..." />
            <Chips label="O que gostaria de aprender ou atuar" valor={form.dons_desejados}
              onChange={v => set('dons_desejados', v)} placeholder="Outro interesse..." />
          </Secao>
        )}

        {c.vida_espiritual && (
          <Secao icon={Cross} titulo="Vida espiritual">
            <SimNao label="É batizado(a) com o Espírito Santo?" valor={form.batizado_espirito_santo}
              onChange={v => {
                set('batizado_espirito_santo', v)
                if (!v) { set('data_batismo_espirito_santo', ''); set('local_batismo_espirito_santo', '') }
              }} />
            {form.batizado_espirito_santo === true && (
              <DataLocal
                id="campo-data_batismo_espirito_santo"
                data={form.data_batismo_espirito_santo} local={form.local_batismo_espirito_santo}
                erro={erros.data_batismo_espirito_santo}
                onData={v => set('data_batismo_espirito_santo', v)} onLocal={v => set('local_batismo_espirito_santo', v)}
              />
            )}
            <SimNao label="É batizado(a) nas águas?" valor={form.batizado_aguas}
              onChange={v => {
                set('batizado_aguas', v)
                if (!v) { set('data_batismo_aguas', ''); set('local_batismo_aguas', '') }
              }} />
            {form.batizado_aguas === true && (
              <DataLocal
                id="campo-data_batismo_aguas"
                data={form.data_batismo_aguas} local={form.local_batismo_aguas}
                erro={erros.data_batismo_aguas}
                onData={v => set('data_batismo_aguas', v)} onLocal={v => set('local_batismo_aguas', v)}
              />
            )}
            <div className="space-y-1.5 pt-1">
              <Label className="text-sm">
                Tem algum dom espiritual? Já pregou? Já discipulou ou foi discipulado(a)? É obreiro(a)? Qual função?
              </Label>
              <Textarea value={form.vida_ministerial} onChange={e => set('vida_ministerial', e.target.value)} rows={3}
                placeholder="Conte um pouco..." />
            </div>
          </Secao>
        )}

        {c.origem_religiosa && (
          <Secao icon={BookOpen} titulo="Se nunca foi evangélico">
            <div className="space-y-1.5">
              <Label className="text-sm">Qual era sua religião? O que você cria?</Label>
              <select
                value={form.origem_religiosa}
                onChange={e => {
                  const v = e.target.value
                  set('origem_religiosa', v)
                  if (v !== 'Outra') set('origem_religiosa_detalhe', '')
                }}
                className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione...</option>
                {ORIGENS_RELIGIOSAS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            {form.origem_religiosa === 'Outra' && (
              <div id="campo-origem_religiosa_detalhe" className="space-y-1.5">
                <Label className="text-sm">Qual? *</Label>
                <Input value={form.origem_religiosa_detalhe} onChange={e => set('origem_religiosa_detalhe', e.target.value)}
                  className={`h-11 ${erros.origem_religiosa_detalhe ? 'border-red-500 focus-visible:ring-red-500' : ''}`} />
                {erros.origem_religiosa_detalhe && <p className="text-xs text-red-500">{erros.origem_religiosa_detalhe}</p>}
              </div>
            )}
            <div className="pt-2 border-t space-y-3">
              <SimNao label="Já fez algum pacto, ritual ou compromisso espiritual em outra religião?" valor={form.tem_pacto}
                onChange={v => {
                  set('tem_pacto', v)
                  if (!v) set('observacao_religiosa', '')
                }} />
              {form.tem_pacto === true && (
                <div className="space-y-1.5 pl-1 -mt-1">
                  <Label className="text-xs text-muted-foreground">Se quiser, conte um pouco sobre isso (opcional)</Label>
                  <Textarea value={form.observacao_religiosa} onChange={e => set('observacao_religiosa', e.target.value)} rows={3}
                    placeholder="Fique à vontade para escrever..." />
                </div>
              )}
            </div>
          </Secao>
        )}

        {c.desafios_pessoais && (
          <Secao icon={HeartHandshake} titulo="Um espaço só seu">
            <p className="text-xs text-muted-foreground -mt-1">
              Traumas psicológicos ou emocionais, vícios, insônia, depressão, finanças... Se quiser compartilhar,
              fica só entre você e quem for te acompanhar.
            </p>
            <Textarea value={form.desafios_pessoais} onChange={e => set('desafios_pessoais', e.target.value)} rows={3}
              placeholder="Fique à vontade para escrever (opcional)..." />
          </Secao>
        )}

        {c.convidado_por && (
          <Secao icon={UserPlus} titulo="Quem te convidou?">
            <Input value={form.convidado_por} onChange={e => set('convidado_por', e.target.value)} placeholder="Nome de quem te convidou ou de conhecidos na igreja" className="h-11" />
          </Secao>
        )}

        {c.observacoes && (
          <Secao icon={MessageSquare} titulo="Quer contar mais alguma coisa?">
            <Textarea value={form.informacoes_complementares} onChange={e => set('informacoes_complementares', e.target.value)} rows={3}
              placeholder="Fique à vontade (opcional)..." />
          </Secao>
        )}

        {erroCampo && (
          <p className="text-sm text-red-500 text-center bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-lg py-2 px-3">
            {erroCampo}
          </p>
        )}

        <Button onClick={enviar} disabled={enviando} className="w-full h-12 text-base gap-2">
          {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Enviar cadastro
        </Button>
        <p className="text-center text-xs text-muted-foreground pb-4">Queremos te conectar ao Reino de Deus.</p>
      </div>
    </div>
  )
}
