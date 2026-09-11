"use client"

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Loader2, Link2, Copy, ExternalLink, ClipboardList, Check } from 'lucide-react'
import type { FormularioPublicoConfig } from '@/types'

type Cong = { id: number; nome: string }

const BLOCOS: { key: keyof FormularioPublicoConfig; titulo: string; descricao: string }[] = [
  { key: 'nascimento', titulo: 'Data de nascimento', descricao: 'Útil para aniversariantes.' },
  { key: 'endereco', titulo: 'Endereço', descricao: 'CEP, logradouro, número, bairro, cidade e estado — mesmo padrão do cadastro de membro.' },
  { key: 'documentos', titulo: 'Documentos', descricao: 'CPF, RG, tipo sanguíneo e naturalidade.' },
  { key: 'estado_civil', titulo: 'Estado civil', descricao: 'Estado civil e data de casamento.' },
  { key: 'escolaridade_area', titulo: 'Formação e área de atuação', descricao: 'Escolaridade e profissão/área de atuação.' },
  { key: 'dons_talentos', titulo: 'Dons e talentos', descricao: 'O que a pessoa já sabe fazer e o que gostaria de aprender.' },
  { key: 'vida_espiritual', titulo: 'Vida espiritual', descricao: 'Batismos (com data e local), dom espiritual, pregação, discipulado, ministério.' },
  { key: 'origem_religiosa', titulo: 'Religião anterior', descricao: 'Para quem nunca foi evangélico.' },
  { key: 'convidado_por', titulo: 'Quem convidou', descricao: 'Quem convidou ou conhecidos na igreja.' },
  { key: 'observacoes', titulo: 'Observações gerais', descricao: 'Espaço livre para a pessoa contar mais.' },
  { key: 'desafios_pessoais', titulo: 'Espaço pessoal (sensível)', descricao: 'Traumas, vícios, insônia, depressão, finanças. Desligado por padrão.' },
]

export default function FormularioPublicoPage() {
  const { token, isAdmin, temPermissao } = useAuth()
  const { toast } = useToast()
  const podeGerenciar = isAdmin || temPermissao('cadastro_publico')
  const [carregandoCongs, setCarregandoCongs] = useState(true)
  const [carregandoConfig, setCarregandoConfig] = useState(false)
  const [config, setConfig] = useState<FormularioPublicoConfig | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [congregacoes, setCongregacoes] = useState<Cong[]>([])
  const [congSelecionada, setCongSelecionada] = useState<number | ''>('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    if (!token || !podeGerenciar) return
    fetch('/api/congregacoes', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then((congs: Cong[]) => {
        setCongregacoes(congs || [])
        if ((congs || []).length === 1) setCongSelecionada(congs[0].id)
      })
      .finally(() => setCarregandoCongs(false))
  }, [token, podeGerenciar])

  const carregarConfig = useCallback(async (congId: number) => {
    if (!token) return
    setCarregandoConfig(true)
    try {
      const res = await fetch(`/api/formulario-publico/config?congregacao_id=${congId}`, { headers: { Authorization: `Bearer ${token}` } })
      setConfig(res.ok ? await res.json() : null)
    } finally {
      setCarregandoConfig(false)
    }
  }, [token])

  useEffect(() => {
    if (congSelecionada) carregarConfig(congSelecionada)
    else setConfig(null)
  }, [congSelecionada, carregarConfig])

  if (!podeGerenciar) {
    return <div className="flex items-center justify-center py-20 text-muted-foreground">Acesso restrito.</div>
  }

  const toggle = (key: keyof FormularioPublicoConfig) => {
    setConfig(c => c ? { ...c, [key]: !c[key] } : c)
  }

  const salvar = async () => {
    if (!config || !congSelecionada) return
    setSalvando(true)
    try {
      const res = await fetch('/api/formulario-publico/config', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, congregacao_id: congSelecionada }),
      })
      if (!res.ok) throw new Error()
      toast({ title: 'Configuração salva!' })
    } catch {
      toast({ title: 'Erro ao salvar.', variant: 'destructive' })
    } finally {
      setSalvando(false)
    }
  }

  const link = congSelecionada && typeof window !== 'undefined'
    ? `${window.location.origin}/cadastro/${congSelecionada}`
    : ''

  const copiarLink = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopiado(true)
      toast({ title: 'Link copiado!' })
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      toast({ title: 'Não foi possível copiar. Selecione e copie manualmente.', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="h-6 w-6" />
          Cadastro Público
        </h1>
        <p className="text-muted-foreground text-sm">
          Gere um link para a pessoa preencher o próprio cadastro. Os envios ficam pendentes na Recepção até serem revisados.
          Cada congregação tem seu próprio link e sua própria configuração.
        </p>
      </div>

      {carregandoCongs ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4" /> Link de cadastro
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Congregação</Label>
                <select
                  value={congSelecionada}
                  onChange={e => setCongSelecionada(e.target.value ? Number(e.target.value) : '')}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione a congregação...</option>
                  {congregacoes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </div>
              {link && (
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 h-10 px-3 rounded-md border border-input bg-muted/40 flex items-center text-sm text-muted-foreground truncate">
                    {link}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="outline" onClick={copiarLink} className="gap-1.5">
                      {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copiado ? 'Copiado' : 'Copiar'}
                    </Button>
                    <a href={link} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" className="gap-1.5">
                        <ExternalLink className="h-4 w-4" /> Abrir
                      </Button>
                    </a>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {!congSelecionada ? (
            <p className="text-sm text-muted-foreground">Selecione uma congregação acima para configurar os blocos do formulário dela.</p>
          ) : carregandoConfig || !config ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quais blocos aparecem no formulário</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-xs text-muted-foreground pb-2">
                    Nome, telefone e e-mail sempre aparecem. Escolha o que mais faz sentido pedir de primeira.
                  </p>
                  {BLOCOS.map(b => (
                    <label key={b.key} className="flex items-start gap-3 py-2.5 border-b last:border-0 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!config[b.key]}
                        onChange={() => toggle(b.key)}
                        className="h-4 w-4 mt-0.5 accent-primary shrink-0"
                      />
                      <span className="flex-1">
                        <span className="text-sm font-medium block">{b.titulo}</span>
                        <span className="text-xs text-muted-foreground">{b.descricao}</span>
                      </span>
                    </label>
                  ))}
                </CardContent>
              </Card>

              <Button onClick={salvar} disabled={salvando} className="gap-2">
                {salvando && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar configuração
              </Button>
            </>
          )}
        </>
      )}
    </div>
  )
}
