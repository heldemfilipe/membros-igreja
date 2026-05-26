import { z } from 'zod'
import { toNull } from './utils'

/**
 * Fonte única para o payload de membro: validação (zod), e construção dos
 * comandos INSERT/UPDATE. Antes as 39 colunas estavam duplicadas nas rotas
 * POST e PUT — adicionar um campo exigia editar três lugares.
 */

const str = z.string().nullable().optional()

const historicoSchema = z
  .object({
    tipo: z.string().optional(),
    data: z.string().nullable().optional(),
    localidade: z.string().nullable().optional(),
    observacoes: z.string().nullable().optional(),
  })
  .passthrough()

const familiarSchema = z
  .object({
    parentesco: z.string(),
    nome: z.string(),
    data_nascimento: z.string().nullable().optional(),
    observacoes: z.string().nullable().optional(),
    membro_vinculado_id: z.number().nullable().optional(),
  })
  .passthrough()

const departamentoVinculoSchema = z
  .object({
    id: z.number().optional(),
    cargo_departamento: z.string().nullable().optional(),
  })
  .passthrough()

export const membroSchema = z.object({
  nome: z.string({ required_error: 'Nome é obrigatório.' }).trim().min(1, 'Nome é obrigatório.'),
  conhecido_como: str,
  igreja: str,
  cargo: str,
  sexo: z.union([z.enum(['Masculino', 'Feminino']), z.literal(''), z.null()]).optional(),
  data_nascimento: str,
  cep: str,
  logradouro: str,
  numero: str,
  complemento: str,
  bairro: str,
  cidade: str,
  estado: str,
  telefone_principal: str,
  telefone_secundario: str,
  email: str,
  cpf: str,
  estado_civil: str,
  profissao: str,
  identidade: str,
  orgao_expedidor: str,
  data_expedicao: str,
  grau_instrucao: str,
  titulo_eleitor: str,
  titulo_eleitor_zona: str,
  titulo_eleitor_secao: str,
  tipo_sanguineo: str,
  cert_nascimento_casamento: str,
  reservista: str,
  carteira_motorista: str,
  chefe_familiar: z.boolean().optional(),
  data_casamento: str,
  naturalidade: str,
  uf_naturalidade: str,
  nacionalidade: str,
  origem_religiosa: str,
  tipo_participante: z.enum(['Membro', 'Congregado', 'Visitante']).optional(),
  informacoes_complementares: str,
  funcao_igreja: str,
  historicos: z.array(historicoSchema).optional(),
  familiares: z.array(familiarSchema).optional(),
  departamentos: z.array(departamentoVinculoSchema).optional(),
})

export type MembroPayload = z.infer<typeof membroSchema>

/**
 * Mapeia o payload para os pares (coluna, valor) na ordem do banco,
 * aplicando os defaults: estado_civil → 'Solteiro(a)', tipo_participante →
 * 'Membro', chefe_familiar → false. Os demais campos viram NULL quando vazios.
 */
function camposMembro(body: MembroPayload): { col: string; value: unknown }[] {
  return [
    { col: 'nome', value: body.nome },
    { col: 'conhecido_como', value: toNull(body.conhecido_como) },
    { col: 'igreja', value: toNull(body.igreja) },
    { col: 'cargo', value: toNull(body.cargo) },
    { col: 'sexo', value: toNull(body.sexo) },
    { col: 'data_nascimento', value: toNull(body.data_nascimento) },
    { col: 'cep', value: toNull(body.cep) },
    { col: 'logradouro', value: toNull(body.logradouro) },
    { col: 'numero', value: toNull(body.numero) },
    { col: 'complemento', value: toNull(body.complemento) },
    { col: 'bairro', value: toNull(body.bairro) },
    { col: 'cidade', value: toNull(body.cidade) },
    { col: 'estado', value: toNull(body.estado) },
    { col: 'telefone_principal', value: toNull(body.telefone_principal) },
    { col: 'telefone_secundario', value: toNull(body.telefone_secundario) },
    { col: 'email', value: toNull(body.email) },
    { col: 'cpf', value: toNull(body.cpf) },
    { col: 'estado_civil', value: body.estado_civil || 'Solteiro(a)' },
    { col: 'profissao', value: toNull(body.profissao) },
    { col: 'identidade', value: toNull(body.identidade) },
    { col: 'orgao_expedidor', value: toNull(body.orgao_expedidor) },
    { col: 'data_expedicao', value: toNull(body.data_expedicao) },
    { col: 'grau_instrucao', value: toNull(body.grau_instrucao) },
    { col: 'titulo_eleitor', value: toNull(body.titulo_eleitor) },
    { col: 'titulo_eleitor_zona', value: toNull(body.titulo_eleitor_zona) },
    { col: 'titulo_eleitor_secao', value: toNull(body.titulo_eleitor_secao) },
    { col: 'tipo_sanguineo', value: toNull(body.tipo_sanguineo) },
    { col: 'cert_nascimento_casamento', value: toNull(body.cert_nascimento_casamento) },
    { col: 'reservista', value: toNull(body.reservista) },
    { col: 'carteira_motorista', value: toNull(body.carteira_motorista) },
    { col: 'chefe_familiar', value: body.chefe_familiar || false },
    { col: 'data_casamento', value: toNull(body.data_casamento) },
    { col: 'naturalidade', value: toNull(body.naturalidade) },
    { col: 'uf_naturalidade', value: toNull(body.uf_naturalidade) },
    { col: 'nacionalidade', value: toNull(body.nacionalidade) },
    { col: 'origem_religiosa', value: toNull(body.origem_religiosa) },
    { col: 'tipo_participante', value: body.tipo_participante || 'Membro' },
    { col: 'informacoes_complementares', value: toNull(body.informacoes_complementares) },
    { col: 'funcao_igreja', value: toNull(body.funcao_igreja) },
  ]
}

export function buildInsertMembro(body: MembroPayload): { text: string; values: unknown[] } {
  const campos = camposMembro(body)
  const cols = campos.map(c => c.col).join(', ')
  const placeholders = campos.map((_, i) => `$${i + 1}`).join(', ')
  return {
    text: `INSERT INTO membros (${cols}) VALUES (${placeholders}) RETURNING id`,
    values: campos.map(c => c.value),
  }
}

export function buildUpdateMembro(body: MembroPayload, id: string | number): { text: string; values: unknown[] } {
  const campos = camposMembro(body)
  const sets = campos.map((c, i) => `${c.col}=$${i + 1}`).join(', ')
  const values = campos.map(c => c.value)
  values.push(id)
  return {
    text: `UPDATE membros SET ${sets} WHERE id=$${values.length}`,
    values,
  }
}
