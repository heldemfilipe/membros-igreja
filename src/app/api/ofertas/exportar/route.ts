import { NextRequest } from 'next/server'
import * as XLSX from 'xlsx'
import pool from '@/lib/db'
import { withAuth } from '@/lib/api'
import { buscarResumoOfertas, lerFiltros } from '@/lib/ofertas-resumo'
import { podeVerDetalhe, TIPOS_OFERTA } from '@/lib/ofertas'

const dataBR = (iso: string | Date) => {
  const s = typeof iso === 'string' ? iso.slice(0, 10) : iso.toISOString().slice(0, 10)
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

/**
 * Planilha do período: Resumo (por congregação), Lançamentos, Cultos sem
 * lançamento e — só para quem tem `ofertas_detalhe_ver` — Por pessoa.
 */
export const GET = withAuth(async (req: NextRequest, user) => {
  const sp = new URL(req.url).searchParams
  const resumo = await buscarResumoOfertas(user, sp) // também valida permissão e escopo
  const { periodo, congs } = await lerFiltros(user, sp)
  const params = [periodo.inicio, periodo.fim, congs]
  const CONG = `($3::int[] IS NULL OR o.congregacao_id = ANY($3::int[]))`

  const wb = XLSX.utils.book_new()

  const linhaTotais = (nome: string, t: (typeof resumo)['atual']) => ({
    'Congregação': nome,
    ...Object.fromEntries(TIPOS_OFERTA.map(x => [x.label, t[x.key]])),
    'Total': t.total,
    'Lançamentos': t.lancamentos,
  })
  const resumoSheet = XLSX.utils.json_to_sheet([
    ...resumo.por_congregacao.map(c => linhaTotais(c.nome, c)),
    linhaTotais('TOTAL', resumo.atual),
  ])
  resumoSheet['!cols'] = [{ wch: 30 }, ...TIPOS_OFERTA.map(() => ({ wch: 14 })), { wch: 14 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, resumoSheet, 'Resumo')

  const lanc = await pool.query(
    `SELECT o.data_culto, c.nome AS congregacao, o.culto_nome, o.dizimos, o.ofertas, o.missoes, o.outros,
            o.observacoes, u.nome AS lancado_por, o.created_at, o.updated_at
     FROM ofertas o JOIN congregacoes c ON c.id = o.congregacao_id
     LEFT JOIN usuarios u ON u.id = o.lancado_por
     WHERE o.data_culto BETWEEN $1::date AND $2::date AND ${CONG}
     ORDER BY o.data_culto, c.nome, o.culto_nome`,
    params,
  )
  const lancSheet = XLSX.utils.json_to_sheet(lanc.rows.map(r => {
    const valores = TIPOS_OFERTA.map(t => [t.label, Number(r[t.key])] as const)
    return {
      'Data': dataBR(r.data_culto),
      'Congregação': r.congregacao,
      'Culto': r.culto_nome,
      ...Object.fromEntries(valores),
      'Total': Math.round(valores.reduce((s, [, v]) => s + v, 0) * 100) / 100,
      'Lançado por': r.lancado_por ?? '',
      'Corrigido': r.updated_at.getTime() !== r.created_at.getTime() ? 'Sim' : '',
      'Observação': r.observacoes ?? '',
    }
  }))
  lancSheet['!cols'] = [{ wch: 11 }, { wch: 25 }, { wch: 25 }, ...TIPOS_OFERTA.map(() => ({ wch: 12 })), { wch: 12 }, { wch: 22 }, { wch: 10 }, { wch: 40 }]
  XLSX.utils.book_append_sheet(wb, lancSheet, 'Lançamentos')

  if (podeVerDetalhe(user)) {
    const itens = await pool.query(
      `SELECT o.data_culto, c.nome AS congregacao, o.culto_nome, i.nome, i.tipo, i.valor,
              CASE WHEN i.membro_id IS NOT NULL THEN 'Cadastrado' ELSE 'Pendente de cadastro' END AS situacao
       FROM oferta_itens i JOIN ofertas o ON o.id = i.oferta_id JOIN congregacoes c ON c.id = o.congregacao_id
       WHERE o.data_culto BETWEEN $1::date AND $2::date AND ${CONG}
       ORDER BY i.nome, o.data_culto`,
      params,
    )
    const label = Object.fromEntries(TIPOS_OFERTA.map(t => [t.key, t.label]))
    const sheet = XLSX.utils.json_to_sheet(itens.rows.map(r => ({
      'Pessoa': r.nome,
      'Data': dataBR(r.data_culto),
      'Congregação': r.congregacao,
      'Culto': r.culto_nome,
      'Tipo': label[r.tipo] ?? r.tipo,
      'Valor': Number(r.valor),
      'Situação': r.situacao,
    })))
    sheet['!cols'] = [{ wch: 30 }, { wch: 11 }, { wch: 25 }, { wch: 25 }, { wch: 10 }, { wch: 12 }, { wch: 20 }]
    XLSX.utils.book_append_sheet(wb, sheet, 'Por pessoa')
  }

  if (resumo.sem_lancamento.length) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo.sem_lancamento.map(s => ({
      'Data': dataBR(s.data), 'Congregação': s.congregacao, 'Culto': s.culto, 'Horário': s.horario,
    }))), 'Cultos sem lançamento')
  }

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
  return new Response(buffer, {
    headers: {
      'Content-Disposition': `attachment; filename="ofertas_${periodo.inicio}_a_${periodo.fim}.xlsx"`,
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  })
})
