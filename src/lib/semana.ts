/**
 * Helpers de semana para a Pauta.
 *
 * Tudo trafega como string 'YYYY-MM-DD' e as contas são feitas em UTC —
 * assim a semana não "anda" um dia por causa do fuso do navegador ou do
 * servidor (Vercel roda em UTC, o Brasil em UTC-3).
 *
 * A semana começa na SEGUNDA-FEIRA (padrão ISO), e `semana_inicio` é sempre
 * essa segunda: é a chave que identifica a semana no banco.
 */

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1))
}

function toISO(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Data de hoje no fuso local de quem chamou, como 'YYYY-MM-DD'. */
export function hojeISO(): string {
  const d = new Date()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** Segunda-feira da semana em que a data cai. */
export function segundaFeira(iso: string): string {
  const d = parseISO(iso)
  const recuo = (d.getUTCDay() + 6) % 7 // domingo(0) → 6, segunda(1) → 0 ...
  d.setUTCDate(d.getUTCDate() - recuo)
  return toISO(d)
}

export function addDias(iso: string, n: number): string {
  const d = parseISO(iso)
  d.setUTCDate(d.getUTCDate() + n)
  return toISO(d)
}

/** `true` se a string tem o formato 'YYYY-MM-DD' e é uma data real. */
export function isISO(iso: unknown): iso is string {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  return toISO(parseISO(iso)) === iso
}

/** Todos os dias do intervalo (inclusive), como 'YYYY-MM-DD'. */
export function diasDoIntervalo(inicio: string, fim: string): string[] {
  const dias: string[] = []
  for (let d = inicio; d <= fim; d = addDias(d, 1)) {
    dias.push(d)
    if (dias.length > 366) break // trava de segurança
  }
  return dias
}

/**
 * Os dias do intervalo no formato 'MM-DD', para comparar aniversários
 * (que se repetem todo ano) sem depender do ano da data cadastrada.
 * Quando o intervalo passa por 28/fev de um ano não-bissexto, inclui
 * também '02-29' — senão quem nasceu em 29/02 nunca apareceria.
 */
export function diasMMDD(inicio: string, fim: string): string[] {
  const dias = diasDoIntervalo(inicio, fim).map(d => d.slice(5))
  if (dias.includes('02-28') && !dias.includes('02-29')) dias.push('02-29')
  return dias
}

/** Rótulo curto da semana: "8 a 14 de setembro" / "29 de set a 5 de out". */
export function rotuloSemana(inicio: string): string {
  const fim = addDias(inicio, 6)
  const a = parseISO(inicio)
  const b = parseISO(fim)
  const diaA = a.getUTCDate()
  const diaB = b.getUTCDate()
  if (a.getUTCMonth() === b.getUTCMonth()) {
    return `${diaA} a ${diaB} de ${MESES[a.getUTCMonth()]}`
  }
  return `${diaA} de ${MESES_CURTOS[a.getUTCMonth()]} a ${diaB} de ${MESES_CURTOS[b.getUTCMonth()]}`
}

/** "seg 08/09" — usado nas linhas de aniversário. */
export function rotuloDia(iso: string): string {
  const d = parseISO(iso)
  const semana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'][d.getUTCDay()]
  return `${semana} ${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
