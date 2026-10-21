import { ApiError } from './api'

export type TipoPeriodo = 'dia' | 'semana' | 'mes' | 'ano' | 'custom'

export interface Periodo {
  tipo: TipoPeriodo
  inicio: string
  fim: string
  anterior_inicio: string
  anterior_fim: string
}

const ISO = /^\d{4}-\d{2}-\d{2}$/
const DIA_MS = 86_400_000

function parse(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function addDias(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DIA_MS)
}

/**
 * Calcula o período (inclusive nas duas pontas) e o período imediatamente
 * anterior, de mesma duração/natureza, para comparação.
 *  - dia: só o dia `ref` (anterior = mesmo dia da semana passada)
 *  - semana: segunda a domingo da semana de `ref`
 *  - mes / ano: mês / ano civil de `ref`
 *  - custom: `inicio`..`fim`; o anterior é o mesmo número de dias antes
 */
export function calcularPeriodo(
  tipo: TipoPeriodo,
  ref: string,
  inicioCustom?: string | null,
  fimCustom?: string | null,
): Periodo {
  if (!ISO.test(ref)) throw new ApiError(400, 'Data de referência inválida.')
  const r = parse(ref)

  if (tipo === 'dia') {
    return { tipo, inicio: ref, fim: ref, anterior_inicio: fmt(addDias(r, -7)), anterior_fim: fmt(addDias(r, -7)) }
  }

  if (tipo === 'semana') {
    const diaSemana = (r.getUTCDay() + 6) % 7 // segunda = 0
    const ini = addDias(r, -diaSemana)
    const fim = addDias(ini, 6)
    return { tipo, inicio: fmt(ini), fim: fmt(fim), anterior_inicio: fmt(addDias(ini, -7)), anterior_fim: fmt(addDias(fim, -7)) }
  }

  if (tipo === 'mes') {
    const y = r.getUTCFullYear()
    const m = r.getUTCMonth()
    return {
      tipo,
      inicio: fmt(new Date(Date.UTC(y, m, 1))),
      fim: fmt(new Date(Date.UTC(y, m + 1, 0))),
      anterior_inicio: fmt(new Date(Date.UTC(y, m - 1, 1))),
      anterior_fim: fmt(new Date(Date.UTC(y, m, 0))),
    }
  }

  if (tipo === 'ano') {
    const y = r.getUTCFullYear()
    return {
      tipo,
      inicio: `${y}-01-01`,
      fim: `${y}-12-31`,
      anterior_inicio: `${y - 1}-01-01`,
      anterior_fim: `${y - 1}-12-31`,
    }
  }

  if (!inicioCustom || !fimCustom || !ISO.test(inicioCustom) || !ISO.test(fimCustom)) {
    throw new ApiError(400, 'Informe a data inicial e final do período.')
  }
  const ini = parse(inicioCustom)
  const fim = parse(fimCustom)
  if (fim < ini) throw new ApiError(400, 'A data final deve ser depois da inicial.')
  const dias = Math.round((fim.getTime() - ini.getTime()) / DIA_MS) + 1
  if (dias > 3660) throw new ApiError(400, 'Período máximo de 10 anos.')
  return {
    tipo,
    inicio: inicioCustom,
    fim: fimCustom,
    anterior_inicio: fmt(addDias(ini, -dias)),
    anterior_fim: fmt(addDias(ini, -1)),
  }
}
