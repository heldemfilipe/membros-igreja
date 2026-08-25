import { NextRequest } from 'next/server'
import { withAuth } from '@/lib/api'
import { buildAccessWhere } from '@/lib/access'
import { normalizar } from '@/lib/utils'
import pool from '@/lib/db'
import * as XLSX from 'xlsx'

/** Normaliza um rótulo para uso seguro em nome de arquivo (sem acentos/espaços). */
function slug(s: string): string {
  return normalizar(s).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'exportacao'
}

export const GET = withAuth(async (req: NextRequest, user) => {
  {
    const { searchParams } = new URL(req.url)
    const congregacaoParam = searchParams.get('congregacao')
    const departamentoParam = searchParams.get('departamento')
    const membrosParam = searchParams.get('membros') // ids separados por vírgula

    let membrosRes
    let escopoLabel: string

    if (membrosParam) {
      // Escopo: pessoas específicas — restringe também ao escopo de acesso do usuário.
      const ids = membrosParam.split(',').map(s => parseInt(s, 10)).filter(n => Number.isFinite(n))
      if (ids.length === 0) return Response.json({ error: 'Nenhum membro selecionado.' }, { status: 200 })

      const { where, params, empty } = buildAccessWhere(user, null)
      if (empty) return Response.json({ error: 'Sem membros no escopo de acesso.' }, { status: 200 })

      membrosRes = await pool.query(
        `SELECT * FROM membros WHERE id = ANY($1::int[])${where} ORDER BY nome`,
        [ids, ...params],
      )
      escopoLabel = membrosRes.rows.length === 1
        ? slug(String(membrosRes.rows[0].nome))
        : `${membrosRes.rows.length}_selecionados`
    } else {
      // Escopo: toda a igreja / uma congregação / um departamento (respeitando acesso do usuário).
      const { where, params, empty } = buildAccessWhere(user, congregacaoParam, { departamentoParam })
      if (empty) return Response.json({ error: 'Sem membros no escopo de acesso.' }, { status: 200 })

      let query = 'SELECT * FROM membros WHERE 1=1'
      if (!user.congregacoes_acesso?.length && congregacaoParam === 'sem') {
        query += ` AND (igreja IS NULL OR igreja = '' OR igreja NOT IN (SELECT nome FROM congregacoes))`
      }
      membrosRes = await pool.query(`${query}${where} ORDER BY nome`, params)

      if (departamentoParam) {
        const d = await pool.query('SELECT nome FROM departamentos WHERE id = $1', [departamentoParam])
        escopoLabel = slug(d.rows[0]?.nome ? `departamento_${d.rows[0].nome}` : 'departamento')
      } else if (congregacaoParam === 'sem') {
        escopoLabel = 'sem_congregacao'
      } else if (congregacaoParam) {
        const c = await pool.query('SELECT nome FROM congregacoes WHERE id = $1', [congregacaoParam])
        escopoLabel = slug(c.rows[0]?.nome ? `congregacao_${c.rows[0].nome}` : 'congregacao')
      } else {
        escopoLabel = 'toda_igreja'
      }
    }

    if (membrosRes.rows.length === 0) {
      return Response.json({ error: 'Nenhum membro encontrado para o escopo selecionado.' }, { status: 200 })
    }

    const idsMembros = membrosRes.rows.map(m => m.id)
    const [historicosRes, familiaresRes] = await Promise.all([
      pool.query('SELECT * FROM historicos WHERE membro_id = ANY($1::int[])', [idsMembros]),
      pool.query('SELECT * FROM familiares WHERE membro_id = ANY($1::int[])', [idsMembros]),
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
        'Content-Disposition': `attachment; filename="membros_${escopoLabel}_${dataAtual}.xlsx"`,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    })
  }
}, { permission: 'membros_exportar' })
