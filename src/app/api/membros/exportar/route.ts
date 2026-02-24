import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized } from '@/lib/auth'
import * as XLSX from 'xlsx'

export async function GET(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  try {
    const [membrosRes, historicosRes, familiaresRes] = await Promise.all([
      pool.query('SELECT * FROM membros ORDER BY nome'),
      pool.query('SELECT * FROM historicos'),
      pool.query('SELECT * FROM familiares'),
    ])

    const historicosMap: Record<number, string[]> = {}
    historicosRes.rows.forEach(h => {
      if (!historicosMap[h.membro_id]) historicosMap[h.membro_id] = []
      const dataH = h.data ? new Date(h.data).toLocaleDateString('pt-BR') : ''
      historicosMap[h.membro_id].push(`[${h.tipo || ''} - ${dataH}]: ${h.observacoes || ''}`)
    })

    const familiaresMap: Record<number, string[]> = {}
    familiaresRes.rows.forEach(f => {
      if (!familiaresMap[f.membro_id]) familiaresMap[f.membro_id] = []
      familiaresMap[f.membro_id].push(`${f.nome || ''} (${f.parentesco || ''})`)
    })

    const dadosCompletos = membrosRes.rows.map(m => ({
      'Nome Completo': m.nome || '',
      'Conhecido Como': m.conhecido_como || '',
      'Igreja': m.igreja || '',
      'Cargo': m.cargo || '',
      'Sexo': m.sexo || '',
      'Data Nascimento': m.data_nascimento ? new Date(m.data_nascimento).toLocaleDateString('pt-BR') : '',
      'CEP': m.cep || '',
      'Logradouro': m.logradouro || '',
      'Número': m.numero || '',
      'Complemento': m.complemento || '',
      'Bairro': m.bairro || '',
      'Cidade': m.cidade || '',
      'Estado (UF)': m.estado || '',
      'Telefone Principal': m.telefone_principal || '',
      'Telefone Secundário': m.telefone_secundario || '',
      'E-mail': m.email || '',
      'CPF': m.cpf || '',
      'Estado Civil': m.estado_civil || '',
      'Profissão': m.profissao || '',
      'RG/Identidade': m.identidade || '',
      'Órgão Expedidor': m.orgao_expedidor || '',
      'Data Expedição': m.data_expedicao ? new Date(m.data_expedicao).toLocaleDateString('pt-BR') : '',
      'Grau Instrução': m.grau_instrucao || '',
      'Título Eleitor': m.titulo_eleitor || '',
      'Zona': m.titulo_eleitor_zona || '',
      'Seção': m.titulo_eleitor_secao || '',
      'Tipo Sanguíneo': m.tipo_sanguineo || '',
      'Certidão Nasc/Casam': m.cert_nascimento_casamento || '',
      'Reservista': m.reservista || '',
      'Carteira Motorista': m.carteira_motorista || '',
      'Chefe Familiar': m.chefe_familiar ? 'Sim' : 'Não',
      'Data Casamento': m.data_casamento ? new Date(m.data_casamento).toLocaleDateString('pt-BR') : '',
      'Naturalidade': m.naturalidade || '',
      'UF Naturalidade': m.uf_naturalidade || '',
      'Nacionalidade': m.nacionalidade || '',
      'Origem Religiosa': m.origem_religiosa || '',
      'Tipo Participante': m.tipo_participante || '',
      'Informações Complementares': m.informacoes_complementares || '',
      'Histórico Eclesiástico': historicosMap[m.id]?.join(' | ') || '',
      'Familiares': familiaresMap[m.id]?.join(' | ') || '',
      'Data Cadastro': m.created_at ? new Date(m.created_at).toLocaleDateString('pt-BR') : '',
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(dadosCompletos)
    ws['!cols'] = [
      { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, { wch: 10 },
      { wch: 15 }, { wch: 10 }, { wch: 30 }, { wch: 8 }, { wch: 15 },
      { wch: 50 }, { wch: 40 },
    ]
    XLSX.utils.book_append_sheet(wb, ws, 'Dados Consolidados')

    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    const dataAtual = new Date().toISOString().split('T')[0]

    return new Response(buffer, {
      headers: {
        'Content-Disposition': `attachment; filename="exportacao_completa_${dataAtual}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: 'Erro ao gerar planilha: ' + msg }, { status: 500 })
  }
}
