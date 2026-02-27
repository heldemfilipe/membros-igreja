import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  // Restrição por departamentos: filtrar stats apenas pelos membros dos depts acessíveis
  const deptoAcesso = user.departamentos_acesso && user.departamentos_acesso.length > 0
    ? user.departamentos_acesso : null

  // Cada query usa $1::int[] quando há restrição — independentes, então $1 em cada
  const dw = deptoAcesso
    ? ` AND id IN (SELECT membro_id FROM membro_departamentos WHERE departamento_id = ANY($1::int[]))`
    : ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dp: any[] = deptoAcesso ? [deptoAcesso] : []

  try {
    const [
      totalMembros, totalCongregados, totalGeral,
      porSexo, porTipo, porCargo, porFaixaEtaria, estatisticasIdade, porEstadoCivil,
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM membros WHERE tipo_participante = 'Membro'${dw}`, dp),
      pool.query(`SELECT COUNT(*) as total FROM membros WHERE tipo_participante = 'Congregado'${dw}`, dp),
      pool.query(`SELECT COUNT(*) as total FROM membros WHERE 1=1${dw}`, dp),
      pool.query(`SELECT sexo, COUNT(*) as total FROM membros WHERE sexo IS NOT NULL AND sexo != ''${dw} GROUP BY sexo ORDER BY total DESC`, dp),
      pool.query(`SELECT tipo_participante, COUNT(*) as total FROM membros WHERE 1=1${dw} GROUP BY tipo_participante ORDER BY total DESC`, dp),
      pool.query(`SELECT cargo, COUNT(*) as total FROM membros WHERE cargo IS NOT NULL AND cargo != ''${dw} GROUP BY cargo ORDER BY total DESC`, dp),
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
          END AS faixa FROM membros WHERE data_nascimento IS NOT NULL${dw}
        ) t GROUP BY faixa
        ORDER BY CASE faixa
          WHEN '0-17 anos' THEN 1 WHEN '18-25 anos' THEN 2 WHEN '26-35 anos' THEN 3
          WHEN '36-45 anos' THEN 4 WHEN '46-60 anos' THEN 5 WHEN 'Acima de 60 anos' THEN 6 ELSE 7 END
      `, dp),
      pool.query(`
        SELECT ROUND(AVG(EXTRACT(YEAR FROM AGE(data_nascimento)))) as idade_media,
               COUNT(*) as total_com_idade
        FROM membros WHERE data_nascimento IS NOT NULL${dw}
      `, dp),
      pool.query(`SELECT estado_civil, COUNT(*) as total FROM membros WHERE estado_civil IS NOT NULL AND estado_civil != ''${dw} GROUP BY estado_civil ORDER BY total DESC`, dp),
    ])

    let porDepartamento: { departamento: string; total: string }[] = []
    try {
      // Se há restrição, mostrar apenas os departamentos acessíveis
      const deptDw = deptoAcesso
        ? ` AND md.departamento_id = ANY($1::int[])`
        : ''
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deptDp: any[] = deptoAcesso ? [deptoAcesso] : []
      const deptResult = await pool.query(`
        SELECT COALESCE(d.nome, 'Sem Departamento') as departamento, COUNT(DISTINCT m.id) as total
        FROM membros m
        LEFT JOIN membro_departamentos md ON m.id = md.membro_id
        LEFT JOIN departamentos d ON md.departamento_id = d.id
        WHERE 1=1${deptDw}
        GROUP BY d.nome ORDER BY total DESC
      `, deptDp)
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
