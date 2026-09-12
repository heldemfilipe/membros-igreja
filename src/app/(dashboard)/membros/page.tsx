"use client"

import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { Membro, Departamento, CadastroPublico } from '@/types'
import { useToast } from '@/components/ui/use-toast'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { VisitorModal } from '@/components/membros/VisitorModal'
import { MemberViewModal } from '@/components/membros/MemberViewModal'
import { MemberModal } from '@/components/membros/MemberModal'
import { ExportModal } from '@/components/membros/ExportModal'
import {
  Loader2, Plus, Search, Pencil, Trash2, Eye, UserPlus, Download, Phone, Church, UserX, UserCheck,
  Inbox, ChevronDown, ChevronUp, Check, X,
} from 'lucide-react'
import { calcularIdade, cn, formatarData } from '@/lib/utils'
import { getCargoStyle, getDeptBadgeStyle, CARGOS_ECLESIASTICOS, TIPO_STYLE, ESTADO_CIVIL_ABREV } from '@/lib/constants'

const LABELS_CADASTRO_PUBLICO: Record<string, string> = {
  email: 'E-mail',
  data_nascimento: 'Nascimento',
  cep: 'CEP',
  logradouro: 'Logradouro',
  numero: 'Número',
  complemento: 'Complemento',
  bairro: 'Bairro',
  cidade: 'Cidade',
  estado: 'Estado (UF)',
  data_casamento: 'Data de casamento',
  estado_civil: 'Estado civil',
  grau_instrucao: 'Formação escolar',
  profissao: 'Área de atuação',
  dons_talentos: 'Dons e talentos',
  dons_desejados: 'Gostaria de aprender',
  batizado_espirito_santo: 'Batizado com Espírito Santo',
  data_batismo_espirito_santo: 'Data (batismo Espírito Santo)',
  local_batismo_espirito_santo: 'Local (batismo Espírito Santo)',
  batizado_aguas: 'Batizado nas águas',
  data_batismo_aguas: 'Data (batismo nas águas)',
  local_batismo_aguas: 'Local (batismo nas águas)',
  vida_ministerial: 'Sobre a caminhada',
  dom_espiritual: 'Dom espiritual',
  ja_pregou: 'Já pregou',
  ja_discipulou: 'Já discipulou',
  foi_discipulado: 'Já foi discipulado(a)',
  eh_obreiro: 'É obreiro(a)',
  funcao_igreja: 'Função na igreja',
  origem_religiosa: 'Religião anterior',
  origem_religiosa_detalhe: 'Qual religião',
  observacao_religiosa: 'Pacto / compromisso espiritual',
  cpf: 'CPF',
  identidade: 'RG / Identidade',
  tipo_sanguineo: 'Tipo sanguíneo',
  naturalidade: 'Naturalidade',
  uf_naturalidade: 'UF Naturalidade',
  dificuldades: 'Quer ajuda com',
  desafios_pessoais: 'História / o que marcou',
  convidado_por: 'Convidado por',
  informacoes_complementares: 'Observações',
}

function camposCadastroPublico(dados: CadastroPublico['dados']): { label: string; valor: string }[] {
  return Object.entries(dados)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => ({
      label: LABELS_CADASTRO_PUBLICO[k] || k,
      valor: typeof v === 'boolean' ? (v ? 'Sim' : 'Não') : String(v),
    }))
}

export default function MembrosPage() {
  const { token, isAdmin, filtroCongregacao, temPermissao } = useAuth()
  const podeEditar = temPermissao('membros_editar')
  const podeExcluir = temPermissao('membros_excluir')
  const podeExportar = temPermissao('membros_exportar')
  const podeRevisarCadastros = temPermissao('recepcao')
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const [membros, setMembros] = useState<Membro[]>([])
  const [pendentes, setPendentes] = useState<CadastroPublico[]>([])
  const [expandidoPendente, setExpandidoPendente] = useState<number | null>(null)
  const [processandoPendente, setProcessandoPendente] = useState<number | null>(null)
  const [departamentos, setDepartamentos] = useState<Departamento[]>([])
  const [congregacoesLista, setCongregacoesLista] = useState<{ id: number; nome: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterTipo, setFilterTipo] = useState(() => searchParams.get('tipo') ?? '')
  const [filterCargo, setFilterCargo] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [filterCongregacao, setFilterCongregacao] = useState('')
  const [filterAtivo, setFilterAtivo] = useState<'true' | 'false' | 'todos'>('true')
  const [visitorModal, setVisitorModal] = useState(false)
  const [viewMembro, setViewMembro] = useState<Membro | null>(null)
  const [memberModal, setMemberModal] = useState<{ open: boolean; id?: number }>({ open: false })
  const [exportModal, setExportModal] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout>>()

  const loadMembros = useCallback(async (silent = false) => {
    if (!token) return
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterTipo) params.set('tipo', filterTipo)
      if (filterCargo) params.set('cargo', filterCargo)
      if (filterDept) params.set('departamento', filterDept)
      if (filterAtivo !== 'true') params.set('ativo', filterAtivo)
      if (filtroCongregacao) params.set('congregacao', String(filtroCongregacao))
      else if (filterCongregacao) params.set('congregacao', filterCongregacao)

      const res = await fetch(`/api/membros?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setMembros(await res.json())
    } finally {
      if (!silent) setLoading(false)
    }
  }, [token, search, filterTipo, filterCargo, filterDept, filterAtivo, filtroCongregacao, filterCongregacao])

  // Atualiza lista sem mostrar spinner (preserva posição de scroll)
  const refreshSilent = useCallback(() => loadMembros(true), [loadMembros])

  useEffect(() => {
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(loadMembros, 300)
    return () => clearTimeout(searchTimer.current)
  }, [loadMembros])

  // Carrega departamentos e congregações em paralelo
  useEffect(() => {
    if (!token) return
    const ctrl = new AbortController()
    const h = { Authorization: `Bearer ${token}` }
    Promise.allSettled([
      fetch('/api/departamentos', { headers: h, signal: ctrl.signal }).then(r => r.ok ? r.json() : []),
      fetch('/api/congregacoes', { headers: h, signal: ctrl.signal }).then(r => r.ok ? r.json() : []),
    ]).then(([deptsRes, congsRes]) => {
      if (deptsRes.status === 'fulfilled') setDepartamentos(deptsRes.value || [])
      if (congsRes.status === 'fulfilled') setCongregacoesLista(congsRes.value || [])
    })
    return () => ctrl.abort()
  }, [token])

  // Resetar filtro local ao ativar filtro global
  useEffect(() => {
    if (filtroCongregacao) setFilterCongregacao('')
  }, [filtroCongregacao])

  const carregarPendentes = useCallback(async () => {
    if (!token || !podeRevisarCadastros) return
    try {
      const cong = filtroCongregacao || filterCongregacao
      const qs = cong ? `&congregacao=${cong}` : ''
      const res = await fetch(`/api/cadastros-publicos?status=pendente${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) setPendentes(await res.json())
    } catch { /* ignore */ }
  }, [token, podeRevisarCadastros, filtroCongregacao, filterCongregacao])

  useEffect(() => { carregarPendentes() }, [carregarPendentes])

  const revisarPendente = async (id: number, acao: 'aprovar' | 'rejeitar') => {
    setProcessandoPendente(id)
    try {
      const res = await fetch(`/api/cadastros-publicos/${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ acao }),
      })
      const data = await res.json()
      if (!res.ok) { toast({ title: data.error || 'Erro ao revisar cadastro.', variant: 'destructive' }); return }
      setPendentes(prev => prev.filter(p => p.id !== id))
      toast({ title: acao === 'aprovar' ? '✓ Cadastro aprovado!' : 'Cadastro rejeitado.' })
      if (acao === 'aprovar') refreshSilent()
    } finally {
      setProcessandoPendente(null)
    }
  }

  const handleToggleAtivo = async (id: number, nome: string, ativoAtual: boolean) => {
    const acao = ativoAtual ? 'desativar' : 'reativar'
    if (!confirm(`${ativoAtual ? 'Desativar' : 'Reativar'} o membro "${nome}"?`)) return
    const res = await fetch(`/api/membros/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !ativoAtual }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: data.error, variant: 'destructive' })
    } else {
      toast({ title: data.message })
      loadMembros()
    }
  }

  const handleDelete = async (id: number, nome: string) => {
    if (!confirm(`Excluir o membro "${nome}"?\n\nEsta ação não pode ser desfeita.`)) return
    const res = await fetch(`/api/membros/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    if (!res.ok) {
      toast({ title: data.error, variant: 'destructive' })
    } else {
      toast({ title: 'Membro excluído.' })
      loadMembros()
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Membros</h1>
          <p className="text-sm text-muted-foreground">
            {loading ? 'Carregando...' : `${membros.length} resultado${membros.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {podeExportar && (
            <Button variant="outline" size="sm" onClick={() => setExportModal(true)}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar Excel</span>
            </Button>
          )}
          {podeEditar && (
            <Button variant="outline" size="sm" onClick={() => setVisitorModal(true)}>
              <UserPlus className="h-4 w-4" />
              Visitante
            </Button>
          )}
          {podeEditar && (
            <Button size="sm" onClick={() => setMemberModal({ open: true })}>
              <Plus className="h-4 w-4" />
              Novo Membro
            </Button>
          )}
        </div>
      </div>

      {/* ─── Cadastros públicos pendentes ────────────────────────────────── */}
      {podeRevisarCadastros && pendentes.length > 0 && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Inbox className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Cadastros públicos pendentes
              <Badge variant="outline" className="ml-1">{pendentes.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendentes.map(p => {
              const aberto = expandidoPendente === p.id
              const campos = camposCadastroPublico(p.dados)
              return (
                <div key={p.id} className="rounded-lg border">
                  <button
                    type="button"
                    onClick={() => setExpandidoPendente(aberto ? null : p.id)}
                    className="w-full flex items-center gap-3 p-3 text-left hover:bg-accent/40 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{p.nome}</p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
                        {p.congregacao_nome && <span className="flex items-center gap-1"><Church className="h-3 w-3" />{p.congregacao_nome}</span>}
                        {p.telefone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{p.telefone}</span>}
                        <span>{formatarData(p.created_at)}</span>
                      </div>
                    </div>
                    {aberto ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  </button>
                  {aberto && (
                    <div className="border-t p-3 space-y-3">
                      {campos.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                          {campos.map(c => (
                            <div key={c.label}>
                              <span className="text-xs text-muted-foreground block">{c.label}</span>
                              <span className="break-words">{c.valor}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Sem campos extras — só nome e telefone.</p>
                      )}
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm" variant="outline"
                          className="gap-1.5 text-destructive hover:text-destructive"
                          disabled={processandoPendente === p.id}
                          onClick={() => revisarPendente(p.id, 'rejeitar')}
                        >
                          <X className="h-3.5 w-3.5" /> Rejeitar
                        </Button>
                        <Button
                          size="sm" className="gap-1.5"
                          disabled={processandoPendente === p.id}
                          onClick={() => revisarPendente(p.id, 'aprovar')}
                        >
                          {processandoPendente === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                          Aprovar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${isAdmin && !filtroCongregacao && congregacoesLista.length > 1 ? 'xl:grid-cols-6' : 'xl:grid-cols-5'}`}>
        <div className="relative sm:col-span-2 xl:col-span-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Buscar por nome..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
        </div>

        <select
          value={filterTipo}
          onChange={e => setFilterTipo(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos os tipos</option>
          <option value="Membro">Membro</option>
          <option value="Congregado">Congregado</option>
          <option value="Visitante">Visitante</option>
        </select>

        <select
          value={filterCargo}
          onChange={e => setFilterCargo(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos os cargos</option>
          {CARGOS_ECLESIASTICOS.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={filterDept}
          onChange={e => setFilterDept(e.target.value)}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Todos os departamentos</option>
          {departamentos.map(d => (
            <option key={d.id} value={String(d.id)}>{d.nome}</option>
          ))}
        </select>

        <select
          value={filterAtivo}
          onChange={e => setFilterAtivo(e.target.value as 'true' | 'false' | 'todos')}
          className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="true">Somente ativos</option>
          <option value="false">Somente inativos</option>
          <option value="todos">Ativos e inativos</option>
        </select>

        {/* Filtro de congregação — só para admins sem filtro global ativo */}
        {isAdmin && !filtroCongregacao && congregacoesLista.length > 1 && (
          <select
            value={filterCongregacao}
            onChange={e => setFilterCongregacao(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Todas as congregações</option>
            <option value="sem">Sem congregação</option>
            {congregacoesLista.map(c => (
              <option key={c.id} value={String(c.id)}>{c.nome}</option>
            ))}
          </select>
        )}
      </div>

      {/* Legenda de cores */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />Membro</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />Congregado</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-amber-500 inline-block" />Visitante</span>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : membros.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">Nenhum membro encontrado.</p>
            {(search || filterTipo || filterCargo || filterDept || filterAtivo !== 'true') && (
              <p className="text-xs text-muted-foreground mt-1">Tente remover os filtros.</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {membros.map(m => {
            const idade = calcularIdade(m.data_nascimento || null)
            const tipoStyle = TIPO_STYLE[m.tipo_participante] || { card: '', avatar: 'bg-primary/10 dark:bg-primary/20 text-primary' }
            const inativo = m.ativo === false
            return (
              <Card key={m.id} className={cn('hover:shadow-sm transition-shadow', tipoStyle.card, inativo && 'opacity-60')}>
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    {/* Avatar colorido por tipo */}
                    <div className={cn(
                      'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm select-none',
                      tipoStyle.avatar
                    )}>
                      {m.nome.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 flex-wrap">
                        <p className="font-semibold text-sm leading-tight">{m.nome}</p>
                        {m.conhecido_como && (
                          <span className="text-xs text-muted-foreground">&quot;{m.conhecido_como}&quot;</span>
                        )}
                        {inativo && (
                          <Badge variant="outline" className="text-xs h-5 border-destructive/50 text-destructive">
                            Inativo
                          </Badge>
                        )}
                      </div>

                      {m.funcao_igreja && (
                        <p className="text-xs text-muted-foreground leading-tight mt-0.5">{m.funcao_igreja}</p>
                      )}

                      {/* Badges pessoais: cargo, sexo, idade, estado civil */}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.cargo && (
                          <Badge className="text-xs h-5" style={getCargoStyle(m.cargo)}>
                            {m.cargo}
                          </Badge>
                        )}
                        {m.sexo && (
                          <Badge
                            variant="outline"
                            className={`text-xs h-5 font-medium ${m.sexo === 'Masculino'
                              ? 'border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400'
                              : 'border-pink-300 text-pink-600 dark:border-pink-700 dark:text-pink-400'
                            }`}
                          >
                            {m.sexo[0]}
                          </Badge>
                        )}
                        {idade !== null && (
                          <Badge variant="outline" className="text-xs h-5 font-semibold text-blue-500 dark:text-blue-400 border-blue-300 dark:border-blue-700">
                            {idade}a
                          </Badge>
                        )}
                        {m.estado_civil && (
                          <Badge variant="outline" className="text-xs h-5 text-muted-foreground">
                            {ESTADO_CIVIL_ABREV[m.estado_civil] ?? m.estado_civil}
                          </Badge>
                        )}
                      </div>

                      {/* Departamentos — sempre visíveis */}
                      {m.departamentos_info && m.departamentos_info.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {m.departamentos_info.map((d, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-xs h-5"
                              style={getDeptBadgeStyle(d.dept_id ?? d.dept_nome)}
                            >
                              {d.dept_nome}{d.cargo_departamento ? ` · ${d.cargo_departamento}` : ''}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Telefone — sempre visível e clicável */}
                      {m.telefone_principal && (
                        <a
                          href={`tel:${m.telefone_principal}`}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary mt-1 w-fit transition-colors"
                        >
                          <Phone className="h-3 w-3" />
                          {m.telefone_principal}
                        </a>
                      )}

                      {/* Congregação — exibe quando sem filtro ativo */}
                      {!filtroCongregacao && !filterCongregacao && m.igreja && (
                        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Church className="h-3 w-3 shrink-0" />
                          {m.igreja}
                        </p>
                      )}
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => setViewMembro(m)}
                        className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {podeEditar && (
                        <button
                          onClick={() => setMemberModal({ open: true, id: m.id })}
                          className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {podeEditar && (
                        <button
                          onClick={() => handleToggleAtivo(m.id, m.nome, m.ativo !== false)}
                          className={cn(
                            'h-8 w-8 rounded-md flex items-center justify-center transition-colors',
                            inativo
                              ? 'text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950'
                              : 'text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950',
                          )}
                          title={inativo ? 'Reativar membro' : 'Desativar membro'}
                        >
                          {inativo ? <UserCheck className="h-4 w-4" /> : <UserX className="h-4 w-4" />}
                        </button>
                      )}
                      {podeExcluir && (
                        <button
                          onClick={() => handleDelete(m.id, m.nome)}
                          className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modais */}
      <VisitorModal
        open={visitorModal}
        onClose={() => setVisitorModal(false)}
        onSuccess={refreshSilent}
        token={token}
      />

      <MemberViewModal
        membro={viewMembro}
        open={!!viewMembro}
        onClose={() => setViewMembro(null)}
        onEdit={podeEditar ? (id => { setViewMembro(null); setMemberModal({ open: true, id }) }) : undefined}
        onVisitaRegistrada={refreshSilent}
      />

      <MemberModal
        open={memberModal.open}
        membroId={memberModal.id}
        onClose={() => setMemberModal({ open: false })}
        onSuccess={refreshSilent}
      />

      <ExportModal
        open={exportModal}
        onClose={() => setExportModal(false)}
        token={token}
        congregacoes={congregacoesLista}
        departamentos={departamentos}
      />
    </div>
  )
}
