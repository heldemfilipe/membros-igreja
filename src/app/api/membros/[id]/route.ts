import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized } from '@/lib/auth'
import { toNull } from '@/lib/utils'

function parentescoReverso(parentesco: string, sexoDoMembro: string | null): string {
  switch (parentesco) {
    case 'Cônjuge':  return 'Cônjuge'
    case 'Filho(a)': return sexoDoMembro === 'Feminino' ? 'Mãe' : 'Pai'
    case 'Pai':      return 'Filho(a)'
    case 'Mãe':      return 'Filho(a)'
    case 'Irmão(ã)': return 'Irmão(ã)'
    case 'Avô/Avó':  return 'Neto(a)'
    case 'Neto(a)':  return 'Avô/Avó'
    default:         return 'Outro'
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  const { id } = params

  try {
    const [membroResult, historicosResult, familiaresResult, deptResult] = await Promise.all([
      pool.query('SELECT * FROM membros WHERE id = $1', [id]),
      pool.query('SELECT * FROM historicos WHERE membro_id = $1 ORDER BY data', [id]),
      pool.query('SELECT * FROM familiares WHERE membro_id = $1', [id]),
      pool.query(
        `SELECT md.departamento_id as id, d.nome, md.cargo_departamento
         FROM membro_departamentos md
         INNER JOIN departamentos d ON md.departamento_id = d.id
         WHERE md.membro_id = $1`,
        [id]
      ).catch(() => ({ rows: [] })),
    ])

    if (membroResult.rows.length === 0) {
      return Response.json({ error: 'Membro não encontrado' }, { status: 404 })
    }

    return Response.json({
      ...membroResult.rows[0],
      historicos: historicosResult.rows,
      familiares: familiaresResult.rows,
      departamentos: deptResult.rows,
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  const { id } = params
  const body = await req.json()
  const {
    nome, conhecido_como, igreja, cargo, sexo, data_nascimento,
    cep, logradouro, numero, complemento, bairro, cidade, estado,
    telefone_principal, telefone_secundario, email, cpf, estado_civil,
    profissao, identidade, orgao_expedidor, data_expedicao, grau_instrucao,
    titulo_eleitor, titulo_eleitor_zona, titulo_eleitor_secao, tipo_sanguineo,
    cert_nascimento_casamento, reservista, carteira_motorista, chefe_familiar,
    data_casamento, naturalidade, uf_naturalidade, nacionalidade, origem_religiosa,
    tipo_participante, informacoes_complementares, funcao_igreja,
    historicos = [], familiares = [], departamentos = [],
  } = body

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Lazy migration: adiciona funcao_igreja se não existir
    try {
      await client.query('ALTER TABLE membros ADD COLUMN IF NOT EXISTS funcao_igreja TEXT')
    } catch { /* ignora se já existir */ }

    await client.query(
      `UPDATE membros SET
        nome=$1, conhecido_como=$2, igreja=$3, cargo=$4, sexo=$5, data_nascimento=$6,
        cep=$7, logradouro=$8, numero=$9, complemento=$10, bairro=$11, cidade=$12, estado=$13,
        telefone_principal=$14, telefone_secundario=$15, email=$16,
        cpf=$17, estado_civil=$18, profissao=$19, identidade=$20, orgao_expedidor=$21, data_expedicao=$22,
        grau_instrucao=$23, titulo_eleitor=$24, titulo_eleitor_zona=$25, titulo_eleitor_secao=$26,
        tipo_sanguineo=$27, cert_nascimento_casamento=$28, reservista=$29, carteira_motorista=$30,
        chefe_familiar=$31, data_casamento=$32, naturalidade=$33, uf_naturalidade=$34, nacionalidade=$35,
        origem_religiosa=$36, tipo_participante=$37, informacoes_complementares=$38, funcao_igreja=$39
      WHERE id=$40`,
      [
        nome, toNull(conhecido_como), toNull(igreja), toNull(cargo), toNull(sexo), toNull(data_nascimento),
        toNull(cep), toNull(logradouro), toNull(numero), toNull(complemento), toNull(bairro), toNull(cidade), toNull(estado),
        toNull(telefone_principal), toNull(telefone_secundario), toNull(email),
        toNull(cpf), toNull(estado_civil), toNull(profissao), toNull(identidade), toNull(orgao_expedidor), toNull(data_expedicao),
        toNull(grau_instrucao), toNull(titulo_eleitor), toNull(titulo_eleitor_zona), toNull(titulo_eleitor_secao),
        toNull(tipo_sanguineo), toNull(cert_nascimento_casamento), toNull(reservista), toNull(carteira_motorista),
        chefe_familiar || false, toNull(data_casamento), toNull(naturalidade), toNull(uf_naturalidade), toNull(nacionalidade),
        toNull(origem_religiosa), tipo_participante, toNull(informacoes_complementares), toNull(funcao_igreja),
        id,
      ]
    )

    await client.query('DELETE FROM historicos WHERE membro_id = $1', [id])
    await client.query('DELETE FROM familiares WHERE membro_id = $1', [id])
    // Remove registros reversos auto-criados que apontam para este membro
    await client.query('DELETE FROM familiares WHERE membro_vinculado_id = $1', [id])

    for (const h of historicos) {
      if (!h.tipo) continue // tipo é obrigatório pelo constraint do banco
      await client.query(
        'INSERT INTO historicos (membro_id, tipo, data, localidade, observacoes) VALUES ($1,$2,$3,$4,$5)',
        [id, h.tipo, toNull(h.data), toNull(h.localidade), toNull(h.observacoes)]
      )
    }

    for (const f of familiares) {
      await client.query(
        'INSERT INTO familiares (membro_id, parentesco, nome, data_nascimento, observacoes, membro_vinculado_id) VALUES ($1,$2,$3,$4,$5,$6)',
        [id, f.parentesco, f.nome, toNull(f.data_nascimento), toNull(f.observacoes), f.membro_vinculado_id || null]
      )
      // Cria parentesco reverso automaticamente no membro vinculado
      if (f.membro_vinculado_id) {
        const reverso = parentescoReverso(f.parentesco, toNull(sexo))
        await client.query(
          'INSERT INTO familiares (membro_id, parentesco, nome, data_nascimento, membro_vinculado_id) VALUES ($1,$2,$3,$4,$5)',
          [f.membro_vinculado_id, reverso, nome, toNull(data_nascimento), id]
        )
      }
    }

    // Atualiza departamentos
    try {
      await client.query('DELETE FROM membro_departamentos WHERE membro_id = $1', [id])
      for (const d of departamentos) {
        if (d.id) {
          await client.query(
            'INSERT INTO membro_departamentos (membro_id, departamento_id, cargo_departamento) VALUES ($1,$2,$3)',
            [id, d.id, toNull(d.cargo_departamento)]
          )
        }
      }
    } catch {
      // tabela pode não existir em todos ambientes
    }

    await client.query('COMMIT')
    return Response.json({ message: 'Membro atualizado com sucesso!' })
  } catch (error: unknown) {
    await client.query('ROLLBACK')
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  } finally {
    client.release()
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  const { id } = params

  try {
    await pool.query('DELETE FROM membros WHERE id = $1', [id])
    return Response.json({ message: 'Membro deletado com sucesso!' })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
