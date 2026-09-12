import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { ApiError, errorResponse } from '@/lib/api'
import { FORMULARIO_PUBLICO_CONFIG_PADRAO } from '@/lib/constants'
import type { FormularioPublicoConfig, CadastroPublicoDados } from '@/types'

/**
 * POST /api/publico/cadastro — SEM autenticação.
 * Recebe o autocadastro da pessoa. Fica pendente em `cadastros_publicos`
 * até a recepção revisar e aprovar (não cria membro direto — a ficha pode
 * trazer informações sensíveis que merecem uma conferência antes).
 *
 * Só aceita os campos que o admin habilitou em formulario_publico_config —
 * o corpo da requisição é de origem pública, então filtramos no servidor
 * em vez de confiar no que o formulário mandou.
 */
export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      throw new ApiError(400, 'Corpo da requisição inválido.')
    }

    const nome = String(body.nome || '').trim()
    const congregacaoId = Number(body.congregacao_id)
    if (nome.length < 2) throw new ApiError(400, 'Informe o nome completo.')
    if (!congregacaoId) throw new ApiError(400, 'Congregação inválida.')

    const cong = await pool.query('SELECT id FROM congregacoes WHERE id = $1', [congregacaoId])
    if (cong.rows.length === 0) throw new ApiError(404, 'Congregação não encontrada.')

    const configResult = await pool.query('SELECT * FROM formulario_publico_config WHERE congregacao_id = $1', [congregacaoId])
    const config = (configResult.rows[0] || FORMULARIO_PUBLICO_CONFIG_PADRAO) as FormularioPublicoConfig

    const str = (v: unknown): string | undefined => {
      const s = typeof v === 'string' ? v.trim() : ''
      return s || undefined
    }
    const bool = (v: unknown): boolean | undefined => (typeof v === 'boolean' ? v : undefined)

    const dados: CadastroPublicoDados = {}
    const email = str(body.email)
    if (email) dados.email = email

    if (config.endereco) {
      const campos = ['cep', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'estado'] as const
      for (const c of campos) {
        const v = str(body[c])
        if (v) dados[c] = v
      }
    }
    if (config.nascimento) {
      const v = str(body.data_nascimento)
      if (v) dados.data_nascimento = v
    }
    if (config.estado_civil) {
      const v = str(body.estado_civil)
      if (v) dados.estado_civil = v
      const dc = str(body.data_casamento)
      if (dc) dados.data_casamento = dc
    }
    if (config.escolaridade_area) {
      const v = str(body.grau_instrucao)
      if (v) dados.grau_instrucao = v
      const p = str(body.profissao)
      if (p) dados.profissao = p
    }
    if (config.dons_talentos) {
      const v = str(body.dons_talentos)
      if (v) dados.dons_talentos = v
      const d = str(body.dons_desejados)
      if (d) dados.dons_desejados = d
    }
    if (config.vida_espiritual) {
      const bes = bool(body.batizado_espirito_santo)
      if (bes !== undefined) dados.batizado_espirito_santo = bes
      if (bes) {
        const d = str(body.data_batismo_espirito_santo)
        if (d) dados.data_batismo_espirito_santo = d
        const l = str(body.local_batismo_espirito_santo)
        if (l) dados.local_batismo_espirito_santo = l
      }
      const ba = bool(body.batizado_aguas)
      if (ba !== undefined) dados.batizado_aguas = ba
      if (ba) {
        const d = str(body.data_batismo_aguas)
        if (d) dados.data_batismo_aguas = d
        const l = str(body.local_batismo_aguas)
        if (l) dados.local_batismo_aguas = l
      }
      const vm = str(body.vida_ministerial)
      if (vm) dados.vida_ministerial = vm
    }
    if (config.origem_religiosa) {
      const v = str(body.origem_religiosa)
      if (v) dados.origem_religiosa = v
      const d = str(body.origem_religiosa_detalhe)
      if (d) dados.origem_religiosa_detalhe = d
      const or = str(body.observacao_religiosa)
      if (or) dados.observacao_religiosa = or
    }
    if (config.documentos) {
      const cpf = str(body.cpf)
      if (cpf) dados.cpf = cpf
      const identidade = str(body.identidade)
      if (identidade) dados.identidade = identidade
      const tipoSanguineo = str(body.tipo_sanguineo)
      if (tipoSanguineo) dados.tipo_sanguineo = tipoSanguineo
      const naturalidade = str(body.naturalidade)
      if (naturalidade) dados.naturalidade = naturalidade
      const ufNaturalidade = str(body.uf_naturalidade)
      if (ufNaturalidade) dados.uf_naturalidade = ufNaturalidade
    }
    if (config.desafios_pessoais) {
      const v = str(body.desafios_pessoais)
      if (v) dados.desafios_pessoais = v
    }
    if (config.convidado_por) {
      const v = str(body.convidado_por)
      if (v) dados.convidado_por = v
    }
    if (config.observacoes) {
      const v = str(body.informacoes_complementares)
      if (v) dados.informacoes_complementares = v
    }

    const telefone = str(body.telefone) || null

    const result = await pool.query(
      `INSERT INTO cadastros_publicos (congregacao_id, nome, telefone, dados)
       VALUES ($1,$2,$3,$4) RETURNING id`,
      [congregacaoId, nome, telefone, JSON.stringify(dados)],
    )

    return Response.json({ id: result.rows[0].id, message: 'Cadastro enviado!' }, { status: 201 })
  } catch (error) {
    return errorResponse(error)
  }
}
