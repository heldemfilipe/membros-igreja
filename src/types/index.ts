export interface Membro {
  id: number
  nome: string
  conhecido_como?: string
  igreja?: string
  cargo?: string
  sexo?: string
  data_nascimento?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  telefone_principal?: string
  telefone_secundario?: string
  email?: string
  cpf?: string
  estado_civil?: string
  profissao?: string
  identidade?: string
  orgao_expedidor?: string
  data_expedicao?: string
  grau_instrucao?: string
  titulo_eleitor?: string
  titulo_eleitor_zona?: string
  titulo_eleitor_secao?: string
  tipo_sanguineo?: string
  cert_nascimento_casamento?: string
  reservista?: string
  carteira_motorista?: string
  chefe_familiar?: boolean
  data_casamento?: string
  naturalidade?: string
  uf_naturalidade?: string
  nacionalidade?: string
  origem_religiosa?: string
  origem_religiosa_detalhe?: string
  observacao_religiosa?: string
  convidado_por?: string
  dons_talentos?: string
  dons_desejados?: string
  batizado_espirito_santo?: boolean | null
  batizado_aguas?: boolean | null
  vida_ministerial?: string | null
  desafios_pessoais?: string | null
  dificuldades?: string | null
  tipo_participante: 'Membro' | 'Congregado' | 'Visitante'
  ativo?: boolean
  informacoes_complementares?: string
  funcao_igreja?: string
  created_at?: string
  updated_at?: string
  // join fields
  departamentos_info?: { dept_id?: number; dept_nome: string; cargo_departamento?: string }[]
}

export interface Historico {
  id?: number
  membro_id?: number
  tipo: string
  data?: string
  localidade?: string
  observacoes?: string
}

export interface Formacao {
  id?: number
  membro_id?: number
  curso: string
  instituicao?: string
  ano_inicio?: number | string | null
  ano_conclusao?: number | string | null
  situacao?: string
  observacoes?: string
}

export interface Familiar {
  id?: number
  membro_id?: number
  parentesco: string
  nome: string
  data_nascimento?: string
  observacoes?: string
  membro_vinculado_id?: number
}

export interface Departamento {
  id: number
  nome: string
  descricao?: string
  total_membros?: number
  congregacao_id?: number | null
  congregacao_nome?: string | null
  created_at?: string
}

export interface MembroDepartamento {
  id: number
  nome: string
  conhecido_como?: string
  cargo?: string
  tipo_participante: string
  telefone_principal?: string
  sexo?: string
  data_nascimento?: string
  cargo_departamento?: string
}

export interface Permissoes {
  dashboard?: boolean
  membros_ver?: boolean
  membros_editar?: boolean
  membros_excluir?: boolean
  membros_exportar?: boolean
  departamentos_ver?: boolean
  departamentos_editar?: boolean
  aniversariantes_ver?: boolean
  congregacoes_ver?: boolean
  congregacoes_editar?: boolean
  registros_ver?: boolean
  registros_editar?: boolean
  usuarios_gerenciar?: boolean
  recepcao?: boolean
  cadastro_publico?: boolean
  [key: string]: boolean | undefined
}

export interface PerfilAcesso {
  id: number
  nome: string
  descricao?: string
  permissoes: Permissoes
  congregacao_id?: number | null
  congregacao_nome?: string | null
  created_at?: string
}

export interface Usuario {
  id: number
  nome: string
  email: string
  tipo: 'admin' | 'usuario'
  ativo: boolean
  created_at?: string
  ultimo_acesso?: string
  perfil_id?: number | null
  perfil_nome?: string | null
  departamentos_acesso?: number[] | null
  congregacoes_acesso?: number[] | null
  deve_trocar_senha?: boolean
  senha_alterada_em?: string | null
}

export interface DashboardData {
  total_membros: number
  total_congregados: number
  total_geral: number
  visitantes?: { semana: number; a_discipular: number; retornaram: number }
  por_sexo: { sexo: string; total: string }[]
  por_tipo: { tipo_participante: string; total: string }[]
  por_cargo: { cargo: string; total: string }[]
  por_faixa_etaria: { faixa: string; total: string }[]
  por_departamento: { departamento: string; total: string }[]
  por_estado_civil: { estado_civil: string; total: string }[]
  estatisticas_idade: {
    idade_media: number
    total_com_idade: number
    idade_min: number
    idade_max: number
    nome_mais_novo: string | null
    cong_mais_novo: string | null
    nome_mais_velho: string | null
    cong_mais_velho: string | null
  }
}

export interface AniversarianteItem {
  id: number
  nome: string
  conhecido_como?: string
  data_nascimento: string
  telefone_principal?: string
  tipo_participante: string
  cargo?: string
  igreja?: string
}

export interface AniversarianteCasamento {
  id: number
  nome: string
  data_casamento: string
  sexo?: string
  telefone_principal?: string
  tipo_participante: string
  igreja?: string
  conjuge_id?: number | null
  conjuge_nome?: string | null
}

export interface Visita {
  id: number
  membro_id: number
  data_visita: string
  observacoes?: string
  created_at?: string
}

export interface VisitaRecente {
  id: number
  membro_id: number
  nome: string
  telefone_principal?: string
  data_visita: string
  observacoes?: string
}

export interface VisitanteFrequente {
  membro_id: number
  nome: string
  telefone_principal?: string
  total_visitas: number
  ultima_visita: string
  primeira_visita: string
}

export interface Acompanhamento {
  contato_feito: boolean
  contato_por: string | null
  contato_data: string | null
  visita_agendada: boolean
  visita_agendada_por: string | null
  visita_casa_data: string | null
  visita_casa_feita: boolean
  voltou_culto: boolean
  voltou_culto_data: string | null
  discipulado: boolean
  discipulado_inicio: string | null
  discipulador: string | null
  batizado: boolean
  congregacao_origem: string | null
  observacoes: string | null
}

export interface Culto {
  id?: number
  nome: string
  dia_semana: number
  horario: string
}

export interface MensagemModelo {
  id: number
  titulo: string
  texto: string
  created_at?: string
}

export interface VisitanteRecepcao extends Acompanhamento {
  membro_id: number
  nome: string
  telefone_principal: string | null
  email: string | null
  data_nascimento: string | null
  informacoes_complementares: string | null
  origem_religiosa: string | null
  origem_religiosa_detalhe: string | null
  igreja: string | null
  total_visitas: number
  ultima_visita: string
  primeira_visita: string
}

// ─── Cadastro público (Linha C) ────────────────────────────────────────────

export interface FormularioPublicoConfig {
  endereco: boolean
  nascimento: boolean
  estado_civil: boolean
  escolaridade_area: boolean
  dons_talentos: boolean
  vida_espiritual: boolean
  origem_religiosa: boolean
  documentos: boolean
  desafios_pessoais: boolean
  convidado_por: boolean
  observacoes: boolean
}

export interface CadastroPublicoDados {
  email?: string
  data_nascimento?: string
  cep?: string
  logradouro?: string
  numero?: string
  complemento?: string
  bairro?: string
  cidade?: string
  estado?: string
  data_casamento?: string
  estado_civil?: string
  grau_instrucao?: string
  profissao?: string
  dons_talentos?: string
  dons_desejados?: string
  batizado_espirito_santo?: boolean
  data_batismo_espirito_santo?: string
  local_batismo_espirito_santo?: string
  batizado_aguas?: boolean
  data_batismo_aguas?: string
  local_batismo_aguas?: string
  vida_ministerial?: string
  origem_religiosa?: string
  origem_religiosa_detalhe?: string
  observacao_religiosa?: string
  cpf?: string
  identidade?: string
  tipo_sanguineo?: string
  naturalidade?: string
  uf_naturalidade?: string
  dificuldades?: string
  desafios_pessoais?: string
  convidado_por?: string
  informacoes_complementares?: string
}

export interface CadastroPublico {
  id: number
  congregacao_id: number | null
  congregacao_nome?: string | null
  nome: string
  telefone: string | null
  dados: CadastroPublicoDados
  status: 'pendente' | 'aprovado' | 'rejeitado'
  membro_id: number | null
  created_at: string
}
