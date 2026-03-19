import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized } from '@/lib/auth'
import { toNull, calcularIdade } from '@/lib/utils'
import { inferirRelacoesFamiliares } from '@/lib/familyInference'
import { buildAccessWhere } from '@/lib/access'

export async function GET(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo')
  const search = searchParams.get('search')
  const cargo = searchParams.get('cargo')
  const departamento = searchParams.get('departamento')
  const congregacaoParam = searchParams.get('congregacao')

  try {
    const baseParams: unknown[] = []
    let query = 'SELECT * FROM membros WHERE 1=1'

    if (tipo) {
      baseParams.push(tipo)
      query += ` AND tipo_participante = $${baseParams.length}`
    }
    if (cargo) {
      baseParams.push(cargo)
      query += ` AND cargo = $${baseParams.length}`
    }
    if (search) {
      baseParams.push(`%${search}%`)
      query += ` AND (nome ILIKE $${baseParams.length} OR conhecido_como ILIKE $${baseParams.length})`
    }

    // Filtro "sem congregação" — só faz sentido quando o usuário não tem restrição de cong.
    if (!user.congregacoes_acesso?.length && congregacaoParam === 'sem') {
      query += ` AND (igreja IS NULL OR igreja = '' OR igreja NOT IN (SELECT nome FROM congregacoes))`
    }

    // Restrições de acesso + filtros voluntários de departamento e congregação
    const { where: accessWhere, params: accessParams, empty } = buildAccessWhere(
      user,
      congregacaoParam,
      { paramOffset: baseParams.length, departamentoParam: departamento },
    )
    if (empty) return Response.json([])

    const params = [...baseParams, ...accessParams]
    query += accessWhere + ' ORDER BY nome'

    const result = await pool.query(query, params)

    // Buscar departamentos
    let deptData: { membro_id: number; dept_id: number; dept_nome: string; cargo_departamento: string }[] = []
    try {
      const deptResult = await pool.query(
        `SELECT md.membro_id, md.departamento_id as dept_id, d.nome as dept_nome, md.cargo_departamento
         FROM membro_departamentos md
         INNER JOIN departamentos d ON md.departamento_id = d.id`
      )
      deptData = deptResult.rows
    } catch {
      // tabela pode não existir ainda
    }

    const deptMap: Record<number, { dept_id: number; dept_nome: string; cargo_departamento: string }[]> = {}
    deptData.forEach(d => {
      if (!deptMap[d.membro_id]) deptMap[d.membro_id] = []
      deptMap[d.membro_id].push({ dept_id: d.dept_id, dept_nome: d.dept_nome, cargo_departamento: d.cargo_departamento })
    })

    const membros = result.rows.map(m => ({
      ...m,
      departamentos_info: deptMap[m.id] || [],
    }))

    return Response.json(membros)
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

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

  // Lazy migrations FORA da transação — DDL que falha dentro do BEGIN
  // aborta toda a transação e impede as queries seguintes de executar.
  try { await client.query('ALTER TABLE membros ADD COLUMN IF NOT EXISTS funcao_igreja TEXT') } catch { }
  try {
    await client.query(`ALTER TABLE historicos DROP CONSTRAINT IF EXISTS historicos_tipo_check`)
    await client.query(`ALTER TABLE historicos ADD CONSTRAINT historicos_tipo_check CHECK (tipo IN ('Conversão','Batismo nas Águas','Batismo no Espírito Santo','Consagração a Diácono(isa)','Consagração a Presbítero','Ordenação a Evangelista','Ordenação a Pastor(a)'))`)
  } catch { }
  try {
    await client.query(`ALTER TABLE familiares DROP CONSTRAINT IF EXISTS familiares_parentesco_check`)
    await client.query(`ALTER TABLE familiares ADD CONSTRAINT familiares_parentesco_check CHECK (parentesco IN ('Pai','Mãe','Cônjuge','Filho(a)','Irmão(ã)','Avô/Avó','Neto(a)','Outro'))`)
  } catch { }

  try {
    await client.query('BEGIN')

    const membroResult = await client.query(
      `INSERT INTO membros (
        nome, conhecido_como, igreja, cargo, sexo, data_nascimento,
        cep, logradouro, numero, complemento, bairro, cidade, estado,
        telefone_principal, telefone_secundario, email,
        cpf, estado_civil, profissao, identidade, orgao_expedidor, data_expedicao,
        grau_instrucao, titulo_eleitor, titulo_eleitor_zona, titulo_eleitor_secao,
        tipo_sanguineo, cert_nascimento_casamento, reservista, carteira_motorista,
        chefe_familiar, data_casamento, naturalidade, uf_naturalidade, nacionalidade,
        origem_religiosa, tipo_participante, informacoes_complementares, funcao_igreja
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39)
      RETURNING id`,
      [
        nome, toNull(conhecido_como), toNull(igreja), toNull(cargo), toNull(sexo), toNull(data_nascimento),
        toNull(cep), toNull(logradouro), toNull(numero), toNull(complemento), toNull(bairro), toNull(cidade), toNull(estado),
        toNull(telefone_principal), toNull(telefone_secundario), toNull(email),
        toNull(cpf), toNull(estado_civil), toNull(profissao), toNull(identidade), toNull(orgao_expedidor), toNull(data_expedicao),
        toNull(grau_instrucao), toNull(titulo_eleitor), toNull(titulo_eleitor_zona), toNull(titulo_eleitor_secao),
        toNull(tipo_sanguineo), toNull(cert_nascimento_casamento), toNull(reservista), toNull(carteira_motorista),
        chefe_familiar || false, toNull(data_casamento), toNull(naturalidade), toNull(uf_naturalidade), toNull(nacionalidade),
        toNull(origem_religiosa), tipo_participante || 'Membro', toNull(informacoes_complementares), toNull(funcao_igreja),
      ]
    )

    const membroId = membroResult.rows[0].id

    for (const h of historicos) {
      await client.query(
        'INSERT INTO historicos (membro_id, tipo, data, localidade, observacoes) VALUES ($1,$2,$3,$4,$5)',
        [membroId, h.tipo, h.data, h.localidade, h.observacoes]
      )
    }

    for (const f of familiares) {
      const familiarResult = await client.query(
        'INSERT INTO familiares (membro_id, parentesco, nome, data_nascimento, observacoes) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [membroId, f.parentesco, f.nome, toNull(f.data_nascimento), f.observacoes]
      )
      const familiarId = familiarResult.rows[0].id

      if (f.parentesco === 'Cônjuge' || f.parentesco === 'Filho(a)') {
        let tipoAutoMembro = 'Membro'
        if (f.parentesco === 'Filho(a)' && f.data_nascimento) {
          const idade = calcularIdade(f.data_nascimento)
          if (idade !== null && idade < 10) tipoAutoMembro = 'Congregado'
        }

        let sexoAuto = null
        if (f.parentesco === 'Cônjuge') {
          sexoAuto = sexo === 'Masculino' ? 'Feminino' : sexo === 'Feminino' ? 'Masculino' : null
        }

        const novoMembroResult = await client.query(
          `INSERT INTO membros (nome, data_nascimento, tipo_participante, sexo, cep, logradouro, numero, complemento, bairro, cidade, estado)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
          [f.nome, toNull(f.data_nascimento), tipoAutoMembro, sexoAuto,
           toNull(cep), toNull(logradouro), toNull(numero), toNull(complemento),
           toNull(bairro), toNull(cidade), toNull(estado)]
        )
        const novoMembroId = novoMembroResult.rows[0].id

        await client.query(
          'UPDATE familiares SET membro_vinculado_id = $1 WHERE id = $2',
          [novoMembroId, familiarId]
        )

        let parentescoReverso = 'Outro'
        if (f.parentesco === 'Cônjuge') parentescoReverso = 'Cônjuge'
        else if (f.parentesco === 'Filho(a)') {
          parentescoReverso = sexo === 'Masculino' ? 'Pai' : sexo === 'Feminino' ? 'Mãe' : 'Outro'
        }

        await client.query(
          'INSERT INTO familiares (membro_id, parentesco, nome, data_nascimento, membro_vinculado_id) VALUES ($1,$2,$3,$4,$5)',
          [novoMembroId, parentescoReverso, nome, toNull(data_nascimento), membroId]
        )
      }
    }

    // Inserir departamentos
    try {
      for (const d of departamentos) {
        if (d.id) {
          await client.query(
            'INSERT INTO membro_departamentos (membro_id, departamento_id, cargo_departamento) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
            [membroId, d.id, toNull(d.cargo_departamento)]
          )
        }
      }
    } catch {
      // tabela pode não existir
    }

    // Inferência automática de relações familiares derivadas
    await inferirRelacoesFamiliares(membroId, toNull(sexo), client)

    // Propaga data_casamento ao cônjuge vinculado (se ele ainda não tiver uma data)
    const dataCasamentoFinal = toNull(data_casamento)
    if (dataCasamentoFinal) {
      await client.query(
        `UPDATE membros SET data_casamento = $1
         WHERE id IN (
           SELECT membro_vinculado_id FROM familiares
           WHERE membro_id = $2 AND parentesco = 'Cônjuge' AND membro_vinculado_id IS NOT NULL
         ) AND data_casamento IS NULL`,
        [dataCasamentoFinal, membroId]
      )
    }

    await client.query('COMMIT')
    return Response.json({ id: membroId, message: 'Membro cadastrado com sucesso!' })
  } catch (error: unknown) {
    await client.query('ROLLBACK')
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  } finally {
    client.release()
  }
}
