import { NextRequest } from 'next/server'
import pool from '@/lib/db'
import { verificarToken, unauthorized } from '@/lib/auth'
import { buildAccessWhere } from '@/lib/access'

// Gera DTSTART com o ano atual para o evento repetir anualmente a partir de hoje
function icsDate(dateStr: string): string {
  const [, month, day] = dateStr.split('T')[0].split('-').map(Number)
  const year = new Date().getFullYear()
  return `${year}${String(month).padStart(2, '0')}${String(day).padStart(2, '0')}`
}

function icsEscape(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
}

function vevent(uid: string, dtstart: string, summary: string, description: string): string {
  const stamp = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z'
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dtstart}`,
    'RRULE:FREQ=YEARLY',
    `SUMMARY:${icsEscape(summary)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    'END:VEVENT',
  ].join('\r\n')
}

export async function GET(req: NextRequest) {
  const user = await verificarToken(req)
  if (!user) return unauthorized()

  const { searchParams } = new URL(req.url)
  const tipo = searchParams.get('tipo') || 'ambos'
  const congregacaoParam = searchParams.get('congregacao')
  const departamentoParam = searchParams.get('departamento')

  const events: string[] = []

  try {
    // ─── Nascimento ───────────────────────────────────────────────────────
    if (tipo === 'nascimento' || tipo === 'ambos') {
      const { where, params, empty } = buildAccessWhere(user, congregacaoParam, { departamentoParam })
      if (!empty) {
        const rows = await pool.query(
          `SELECT id, nome, conhecido_como, data_nascimento, telefone_principal, tipo_participante
           FROM membros WHERE data_nascimento IS NOT NULL${where}
           ORDER BY EXTRACT(MONTH FROM data_nascimento), EXTRACT(DAY FROM data_nascimento)`,
          params
        )
        for (const m of rows.rows) {
          const anoNasc = parseInt(m.data_nascimento.split('T')[0].split('-')[0])
          const idade = new Date().getFullYear() - anoNasc
          const nome = m.conhecido_como ? `${m.nome} (${m.conhecido_como})` : m.nome
          const desc = [
            `Fará ${idade} anos`,
            m.telefone_principal ? `Tel: ${m.telefone_principal}` : null,
            `Tipo: ${m.tipo_participante}`,
          ].filter(Boolean).join('\n')
          events.push(vevent(
            `membro-${m.id}-nasc@sistema-igreja`,
            icsDate(m.data_nascimento),
            `🎂 ${nome}`,
            desc,
          ))
        }
      }
    }

    // ─── Casamento ────────────────────────────────────────────────────────
    if (tipo === 'casamento' || tipo === 'ambos') {
      const { where: extraWhere, params, empty } = buildAccessWhere(user, congregacaoParam, {
        tableAlias: 'm',
        departamentoParam,
      })
      if (!empty) {
        const rows = await pool.query(
          `WITH todos AS (
            SELECT
              m.id, m.nome, m.data_casamento,
              m.telefone_principal, m.tipo_participante,
              f.membro_vinculado_id AS conjuge_id,
              mc.nome AS conjuge_nome
            FROM membros m
            LEFT JOIN familiares f
              ON f.membro_id = m.id AND f.parentesco = 'Cônjuge' AND f.membro_vinculado_id IS NOT NULL
            LEFT JOIN membros mc ON mc.id = f.membro_vinculado_id
            WHERE m.data_casamento IS NOT NULL${extraWhere}

            UNION ALL

            SELECT
              m.id, m.nome, mc.data_casamento,
              m.telefone_principal, m.tipo_participante,
              mc.id AS conjuge_id, mc.nome AS conjuge_nome
            FROM membros m
            JOIN familiares f
              ON f.membro_id = m.id AND f.parentesco = 'Cônjuge' AND f.membro_vinculado_id IS NOT NULL
            JOIN membros mc ON mc.id = f.membro_vinculado_id
            WHERE m.data_casamento IS NULL AND mc.data_casamento IS NOT NULL${extraWhere}
          )
          SELECT DISTINCT ON (LEAST(id, COALESCE(conjuge_id, id)))
            id, nome, data_casamento, telefone_principal, tipo_participante, conjuge_id, conjuge_nome
          FROM todos
          ORDER BY LEAST(id, COALESCE(conjuge_id, id))`,
          params
        )
        for (const m of rows.rows) {
          const anoCas = parseInt(m.data_casamento.split('T')[0].split('-')[0])
          const anos = new Date().getFullYear() - anoCas
          const nomes = m.conjuge_nome ? `${m.nome} & ${m.conjuge_nome}` : m.nome
          const desc = [
            `${anos} anos de casamento`,
            m.telefone_principal ? `Tel: ${m.telefone_principal}` : null,
          ].filter(Boolean).join('\n')
          // UID do casal: sempre usa o menor id para ser estável independente de quem é o "principal"
          const coupleKey = m.conjuge_id ? Math.min(m.id, m.conjuge_id) : m.id
          events.push(vevent(
            `casal-${coupleKey}-cas@sistema-igreja`,
            icsDate(m.data_casamento),
            `💍 ${nomes}`,
            desc,
          ))
        }
      }
    }

    const calName =
      tipo === 'nascimento' ? 'Aniversários — Nascimento'
      : tipo === 'casamento' ? 'Aniversários — Casamento'
      : 'Aniversariantes da Igreja'

    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '')

    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Sistema Igreja//Membros//PT-BR',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${calName}`,
      'X-WR-TIMEZONE:America/Sao_Paulo',
      ...events,
      'END:VCALENDAR',
    ].join('\r\n')

    return new Response(ics, {
      headers: {
        'Content-Disposition': `attachment; filename="aniversariantes_${tipo}_${date}.ics"`,
        'Content-Type': 'text/calendar; charset=utf-8',
      },
    })
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro desconhecido'
    return Response.json({ error: msg }, { status: 500 })
  }
}
