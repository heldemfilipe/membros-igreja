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
  Cross, BookOpen, HeartHandshake, UserPlus, MessageSquare, X, Check,
} from 'lucide-react'
import { DONS_TALENTOS, ORIGENS_RELIGIOSAS } from '@/lib/constants'
import type { FormularioPublicoConfig } from '@/types'

type Form = {
  nome: string
  telefone: string
  email: string
  data_nascimento: string
  endereco: string
  estado_civil: string
  data_casamento: string
  grau_instrucao: string
  profissao: string
  dons_talentos: string
  dons_desejados: string
  batizado_espirito_santo: boolean | null
  batizado_aguas: boolean | null
  vida_ministerial: string
  origem_religiosa: string
  origem_religiosa_detalhe: string
  desafios_pessoais: string
  convidado_por: string
  informacoes_complementares: string
}

const vazio: Form = {
  nome: '', telefone: '', email: '', data_nascimento: '', endereco: '',
  estado_civil: '', data_casamento: '', grau_instrucao: '', profissao: '',
  dons_talentos: '', dons_desejados: '',
  batizado_espirito_santo: null, batizado_aguas: null, vida_ministerial: '',
  origem_religiosa: '', origem_religiosa_detalhe: '',
  desafios_pessoais: '', convidado_por: '', informacoes_complementares: '',
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

export default function CadastroPublicoPage() {
  const params = useParams<{ congregacaoId: string }>()
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [congNome, setCongNome] = useState('')
  const [campos, setCampos] = useState<FormularioPublicoConfig | null>(null)
  const [form, setForm] = useState<Form>(vazio)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erroCampo, setErroCampo] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/publico/formulario/${params.congregacaoId}`)
      .then(async r => {
        if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || 'Link inválido.') }
        return r.json()
      })
      .then(data => { setCongNome(data.congregacao?.nome || ''); setCampos(data.campos) })
      .catch(e => setErro(e.message || 'Não foi possível carregar este formulário.'))
      .finally(() => setCarregando(false))
  }, [params.congregacaoId])

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm(f => ({ ...f, [k]: v }))

  const enviar = async () => {
    if (!form.nome.trim()) { setErroCampo('Informe seu nome completo.'); return }
    setErroCampo(null)
    setEnviando(true)
    try {
      const res = await fetch('/api/publico/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, congregacao_id: Number(params.congregacaoId) }),
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
          <div className="space-y-1.5">
            <Label className="text-sm">Nome completo *</Label>
            <Input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Seu nome completo"
              className="h-11" autoFocus />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm">Telefone / WhatsApp</Label>
              <Input type="tel" value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(00) 00000-0000" className="h-11" />
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
            <Textarea value={form.endereco} onChange={e => set('endereco', e.target.value)} rows={2}
              placeholder="Rua, número, bairro, cidade..." />
          </Secao>
        )}

        {c.estado_civil && (
          <Secao icon={HeartHandshake} titulo="Estado civil">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Estado civil</Label>
                <select value={form.estado_civil} onChange={e => set('estado_civil', e.target.value)}
                  className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">Selecione...</option>
                  {['Solteiro(a)', 'Casado(a)', 'União Estável', 'Divorciado(a)', 'Separado(a)', 'Viúvo(a)'].map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Data de casamento</Label>
                <Input type="date" value={form.data_casamento} onChange={e => set('data_casamento', e.target.value)} className="h-11" />
              </div>
            </div>
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
              onChange={v => set('batizado_espirito_santo', v)} />
            <SimNao label="É batizado(a) nas águas?" valor={form.batizado_aguas}
              onChange={v => set('batizado_aguas', v)} />
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
              <select value={form.origem_religiosa} onChange={e => set('origem_religiosa', e.target.value)}
                className="w-full h-11 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Selecione...</option>
                {ORIGENS_RELIGIOSAS.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            {form.origem_religiosa === 'Outra' && (
              <div className="space-y-1.5">
                <Label className="text-sm">Qual?</Label>
                <Input value={form.origem_religiosa_detalhe} onChange={e => set('origem_religiosa_detalhe', e.target.value)} className="h-11" />
              </div>
            )}
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
