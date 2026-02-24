import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  try {
    const [
      totalMembros, totalCongregados, totalGeral,
      porSexo, porTipo, porCargo, porFaixaEtaria, estatisticasIdade, porEstadoCivil,
    ] = await Promise.all([
      pool.query("SELECT COUNT(*) as total FROM membros WHERE tipo_participante = 'Membro'"),
      pool.query("SELECT COUNT(*) as total FROM membros WHERE tipo_participante = 'Congregado'"),
      pool.query('SELECT COUNT(*) as total FROM membros'),
      pool.query("SELECT sexo, COUNT(*) as total FROM membros WHERE sexo IS NOT NULL AND sexo != '' GROUP BY sexo ORDER BY total DESC"),
      pool.query('SELECT tipo_participante, COUNT(*) as total FROM membros GROUP BY tipo_participante ORDER BY total DESC'),
      pool.query("SELECT cargo, COUNT(*) as total FROM membros WHERE cargo IS NOT NULL AND cargo != '' GROUP BY cargo ORDER BY total DESC"),
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
          END AS faixa FROM membros WHERE data_nascimento IS NOT NULL
        ) t GROUP BY faixa
        ORDER BY CASE faixa
          WHEN '0-17 anos' THEN 1 WHEN '18-25 anos' THEN 2 WHEN '26-35 anos' THEN 3
          WHEN '36-45 anos' THEN 4 WHEN '46-60 anos' THEN 5 WHEN 'Acima de 60 anos' THEN 6 ELSE 7 END
      `),
      pool.query(`
        SELECT ROUND(AVG(EXTRACT(YEAR FROM AGE(data_nascimento)))) as idade_media,
               COUNT(*) as total_com_idade
        FROM membros WHERE data_nascimento IS NOT NULL
      `),
      pool.query("SELECT estado_civil, COUNT(*) as total FROM membros WHERE estado_civil IS NOT NULL AND estado_civil != '' GROUP BY estado_civil ORDER BY total DESC"),
    ])

    let porDepartamento: { departamento: string; total: string }[] = []
    try {
      const deptResult = await pool.query(`
        SELECT COALESCE(d.nome, 'Sem Departamento') as departamento, COUNT(DISTINCT m.id) as total
        FROM membros m
        LEFT JOIN membro_departamentos md ON m.id = md.membro_id
        LEFT JOIN departamentos d ON md.departamento_id = d.id
        GROUP BY d.nome ORDER BY total DESC
      `)
      porDepartamento = deptResult.rows
    } catch {
      // ignore
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
