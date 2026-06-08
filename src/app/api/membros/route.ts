import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { withAuth, parseBody } from '@/lib/api'
import { toNull, calcularIdade } from '@/lib/utils'
import { inferirRelacoesFamiliares } from '@/lib/familyInference'
import { buildAccessWhere } from '@/lib/access'
import { membroSchema, buildInsertMembro } from '@/lib/membros-schema'

export const GET = withAuth(async (req: NextRequest, user) => {
  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo')
  const search = searchParams.get('search')
  const cargo = searchParams.get('cargo')
  const departamento = searchParams.get('departamento')
  const congregacaoParam = searchParams.get('congregacao')
  // 'todos' = mostra ativos e inativos; qualquer outro valor (ou ausente) = só ativos
  const apenasInativos = searchParams.get('ativo') === 'false'
  const mostrarTodos = searchParams.get('ativo') === 'todos'

  const baseParams: unknown[] = []
  let query = 'SELECT * FROM membros WHERE 1=1'

  if (mostrarTodos) {
    // sem filtro de ativo — retorna ambos
  } else if (apenasInativos) {
    query += ' AND (ativo = FALSE OR ativo IS NULL)'
  } else {
    query += ' AND ativo = TRUE'
  }

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
    query += ` AND (unaccent(nome) ILIKE unaccent($${baseParams.length}) OR unaccent(conhecido_como) ILIKE unaccent($${baseParams.length}))`
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

  const deptResult = await pool.query(
    `SELECT md.membro_id, md.departamento_id as dept_id, d.nome as dept_nome, md.cargo_departamento
     FROM membro_departamentos md
     INNER JOIN departamentos d ON md.departamento_id = d.id`,
  )

  const deptMap: Record<number, { dept_id: number; dept_nome: string; cargo_departamento: string }[]> = {}
  deptResult.rows.forEach(d => {
    if (!deptMap[d.membro_id]) deptMap[d.membro_id] = []
    deptMap[d.membro_id].push({ dept_id: d.dept_id, dept_nome: d.dept_nome, cargo_departamento: d.cargo_departamento })
  })

  const membros = result.rows.map(m => ({
    ...m,
    departamentos_info: deptMap[m.id] || [],
  }))

  return Response.json(membros)
})

export const POST = withAuth(async (req: NextRequest) => {
  const body = await parseBody(req, membroSchema)
  const { sexo, nome, data_nascimento, historicos = [], familiares = [], departamentos = [] } = body

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const insert = buildInsertMembro(body)
    const membroResult = await client.query(insert.text, insert.values)
    const membroId = membroResult.rows[0].id

    for (const h of historicos) {
      if (!h.tipo) continue
      await client.query(
        'INSERT INTO historicos (membro_id, tipo, data, localidade, observacoes) VALUES ($1,$2,$3,$4,$5)',
        [membroId, h.tipo, toNull(h.data), toNull(h.localidade), toNull(h.observacoes)],
      )
    }

    for (const f of familiares) {
      // Familiar já vinculado a um membro existente: apenas registra a relação.
      if (f.membro_vinculado_id) {
        await client.query(
          `INSERT INTO familiares (membro_id, parentesco, nome, data_nascimento, observacoes, membro_vinculado_id)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [membroId, f.parentesco, f.nome, toNull(f.data_nascimento), toNull(f.observacoes), f.membro_vinculado_id],
        )
        const rev = await client.query(
          'SELECT id FROM familiares WHERE membro_id=$1 AND membro_vinculado_id=$2',
          [f.membro_vinculado_id, membroId],
        )
        if (rev.rows.length === 0) {
          let parentescoRev = 'Outro'
          if (f.parentesco === 'Cônjuge') parentescoRev = 'Cônjuge'
          else if (f.parentesco === 'Filho(a)') parentescoRev = sexo === 'Masculino' ? 'Pai' : sexo === 'Feminino' ? 'Mãe' : 'Outro'
          await client.query(
            'INSERT INTO familiares (membro_id, parentesco, nome, data_nascimento, membro_vinculado_id) VALUES ($1,$2,$3,$4,$5)',
            [f.membro_vinculado_id, parentescoRev, nome, toNull(data_nascimento), membroId],
          )
        }
        continue
      }

      // Familiar sem vínculo — insere e, para Cônjuge/Filho(a), cria o membro automaticamente
      const familiarResult = await client.query(
        'INSERT INTO familiares (membro_id, parentesco, nome, data_nascimento, observacoes) VALUES ($1,$2,$3,$4,$5) RETURNING id',
        [membroId, f.parentesco, f.nome, toNull(f.data_nascimento), toNull(f.observacoes)],
      )
      const familiarId = familiarResult.rows[0].id

      if (f.parentesco === 'Cônjuge' || f.parentesco === 'Filho(a)') {
        let tipoAutoMembro = 'Membro'
        if (f.parentesco === 'Filho(a)' && f.data_nascimento) {
          const idade = calcularIdade(f.data_nascimento)
          if (idade !== null && idade < 10) tipoAutoMembro = 'Congregado'
        }

        let sexoAuto: string | null = null
        if (f.parentesco === 'Cônjuge') {
          sexoAuto = sexo === 'Masculino' ? 'Feminino' : sexo === 'Feminino' ? 'Masculino' : null
        }

        const novoMembroResult = await client.query(
          `INSERT INTO membros (nome, data_nascimento, tipo_participante, sexo, cep, logradouro, numero, complemento, bairro, cidade, estado)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
          [f.nome, toNull(f.data_nascimento), tipoAutoMembro, sexoAuto,
           toNull(body.cep), toNull(body.logradouro), toNull(body.numero), toNull(body.complemento),
           toNull(body.bairro), toNull(body.cidade), toNull(body.estado)],
        )
        const novoMembroId = novoMembroResult.rows[0].id

        await client.query('UPDATE familiares SET membro_vinculado_id = $1 WHERE id = $2', [novoMembroId, familiarId])

        let parentescoReverso = 'Outro'
        if (f.parentesco === 'Cônjuge') parentescoReverso = 'Cônjuge'
        else if (f.parentesco === 'Filho(a)') {
          parentescoReverso = sexo === 'Masculino' ? 'Pai' : sexo === 'Feminino' ? 'Mãe' : 'Outro'
        }

        await client.query(
          'INSERT INTO familiares (membro_id, parentesco, nome, data_nascimento, membro_vinculado_id) VALUES ($1,$2,$3,$4,$5)',
          [novoMembroId, parentescoReverso, nome, toNull(data_nascimento), membroId],
        )
      }
    }

    for (const d of departamentos) {
      if (d.id) {
        await client.query(
          'INSERT INTO membro_departamentos (membro_id, departamento_id, cargo_departamento) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING',
          [membroId, d.id, toNull(d.cargo_departamento)],
        )
      }
    }

    await inferirRelacoesFamiliares(membroId, toNull(sexo), client)

    const dataCasamentoFinal = toNull(body.data_casamento)
    if (dataCasamentoFinal) {
      await client.query(
        `UPDATE membros SET data_casamento = $1
         WHERE id IN (
           SELECT membro_vinculado_id FROM familiares
           WHERE membro_id = $2 AND parentesco = 'Cônjuge' AND membro_vinculado_id IS NOT NULL
         ) AND data_casamento IS NULL`,
        [dataCasamentoFinal, membroId],
      )
    }

    await client.query('COMMIT')
    return Response.json({ id: membroId, message: 'Membro cadastrado com sucesso!' })
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}, { permission: 'membros_editar' })
