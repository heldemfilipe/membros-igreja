import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized } from '@/lib/auth'
import { buildAccessWhere } from '@/lib/access'

export async function GET(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  const { searchParams } = new URL(req.url)
  const congregacaoParam = searchParams.get('congregacao')

  // Filtro unificado de acesso (departamento + congregação)
  // paramOffset=0 porque cada pool.query reutiliza os mesmos params a partir de $1
  const { where: f, params: fp } = buildAccessWhere(user, congregacaoParam)

  try {
    const [
      totalMembros, totalCongregados, totalGeral,
      porSexo, porTipo, porCargo, porFaixaEtaria, estatisticasIdade, porEstadoCivil,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM membros WHERE tipo_participante = 'Membro'${f}`, fp),
      pool.query(`SELECT COUNT(*) as total FROM membros WHERE tipo_participante = 'Congregado'${f}`, fp),
      pool.query(`SELECT COUNT(*) as total FROM membros WHERE 1=1${f}`, fp),
      pool.query(`SELECT sexo, COUNT(*) as total FROM membros WHERE sexo IS NOT NULL AND sexo != ''${f} GROUP BY sexo ORDER BY total DESC`, fp),
      pool.query(`SELECT tipo_participante, COUNT(*) as total FROM membros WHERE 1=1${f} GROUP BY tipo_participante ORDER BY total DESC`, fp),
      pool.query(`SELECT cargo, COUNT(*) as total FROM membros WHERE cargo IS NOT NULL AND cargo != ''${f} GROUP BY cargo ORDER BY total DESC`, fp),
      pool.query(`
        SELECT faixa, COUNT(*) AS total FROM (
          SELECT CASE
            WHEN EXTRACT(YEAR FROM AGE(data_nascimento)) < 18 THEN '0-17 anos'
            WHEN EXTRACT(YEAR FROM AGE(data_nascimento)) BETWEEN 18 AND 25 THEN '18-25 anos'
            WHEN EXTRACT(YEAR FROM AGE(data_nascimento)) BETWEEN 26 AND 35 THEN '26-35 anos'
            WHEN EXTRACT(YEAR FROM AGE(data_nascimento)) BETWEEN 36 AND 45 THEN '36-45 anos'
            WHEN EXTRACT(YEAR FROM AGE(data_nascimento)) BETWEEN 46 AND 60 THEN '46-60 anos'
            WHEN EXTRACT(YEAR FROM AGE(data_nascimento)) > 60 THEN 'Acima de 60 anos'
            ELSE 'Não informado'
          END AS faixa FROM membros WHERE data_nascimento IS NOT NULL${f}
        ) t GROUP BY faixa
        ORDER BY CASE faixa
          WHEN '0-17 anos' THEN 1 WHEN '18-25 anos' THEN 2 WHEN '26-35 anos' THEN 3
          WHEN '36-45 anos' THEN 4 WHEN '46-60 anos' THEN 5 WHEN 'Acima de 60 anos' THEN 6 ELSE 7 END
      `, fp),
      pool.query(`
        SELECT ROUND(AVG(EXTRACT(YEAR FROM AGE(data_nascimento)))) as idade_media,
               COUNT(*) as total_com_idade
        FROM membros WHERE data_nascimento IS NOT NULL${f}
      `, fp),
      pool.query(`SELECT estado_civil, COUNT(*) as total FROM membros WHERE estado_civil IS NOT NULL AND estado_civil != ''${f} GROUP BY estado_civil ORDER BY total DESC`, fp),
    ])

    let porDepartamento: { departamento: string; total: string }[] = []
    try {
      // Esta query usa JOIN com membro_departamentos, então o filtro de departamento
      // é feito via md.departamento_id (não subquery). Reusamos apenas o filtro de congregação.
      const deptoAcesso = user.departamentos_acesso?.length ? user.departamentos_acesso : null
      const congAcesso = user.congregacoes_acesso?.length ? user.congregacoes_acesso : null
      const effectiveCong = congAcesso
        ? (congregacaoParam ? congAcesso.filter(id => id === parseInt(congregacaoParam)) : congAcesso)
        : (congregacaoParam ? [parseInt(congregacaoParam)] : null)

      const deptParams: unknown[] = []
      let deptWhere = ''
      if (deptoAcesso) {
        deptParams.push(deptoAcesso)
        deptWhere += ` AND md.departamento_id = ANY($${deptParams.length}::int[])`
      }
      if (effectiveCong) {
        deptParams.push(effectiveCong)
        deptWhere += ` AND m.igreja IN (SELECT nome FROM congregacoes WHERE id = ANY($${deptParams.length}::int[]))`
      }

      const deptResult = await pool.query(`
        SELECT COALESCE(d.nome, 'Sem Departamento') as departamento, COUNT(DISTINCT m.id) as total
        FROM membros m
        LEFT JOIN membro_departamentos md ON m.id = md.membro_id
        LEFT JOIN departamentos d ON md.departamento_id = d.id
        WHERE 1=1${deptWhere}
        GROUP BY d.nome ORDER BY total DESC
      `, deptParams)
      porDepartamento = deptResult.rows
    } catch {
      // ignora se tabela não existir
    }

    return Response.json({
      total_membros: parseInt(totalMembros.rows[0].total),
      total_congregados: parseInt(totalCongregados.rows[0].total),
      total_geral: parseInt(totalGeral.rows[0].total),
      por_sexo: porSexo.rows,
      por_tipo: porTipo.rows,
      por_cargo: porCargo.rows,
      por_faixa_etaria: porFaixaEtaria.rows,
      por_departamento: porDepartamento,
      por_estado_civil: porEstadoCivil.rows,
      estatisticas_idade: {
        idade_media: parseInt(estatisticasIdade.rows[0].idade_media) || 0,
        total_com_idade: parseInt(estatisticasIdade.rows[0].total_com_idade) || 0,
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
