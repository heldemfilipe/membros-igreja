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
  tipo_participante: 'Membro' | 'Congregado' | 'Visitante'
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
  [key: string]: boolean | undefined
}

export interface PerfilAcesso {
  id: number
  nome: string
  descricao?: string
  permissoes: Permissoes
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
}

export interface DashboardData {
  total_membros: number
  total_congregados: number
  total_geral: number
  por_sexo: { sexo: string; total: string }[]
  por_tipo: { tipo_participante: string; total: string }[]
  por_cargo: { cargo: string; total: string }[]
  por_faixa_etaria: { faixa: string; total: string }[]
  por_departamento: { departamento: string; total: string }[]
  por_estado_civil: { estado_civil: string; total: string }[]
  estatisticas_idade: {
    idade_media: number
    total_com_idade: number
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
