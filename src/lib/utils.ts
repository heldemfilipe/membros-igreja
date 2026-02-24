import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parseia uma string de data (YYYY-MM-DD ou ISO) como data local,
 * evitando deslocamento de fuso horário (UTC midnight → dia anterior).
 */
export function parseLocalDate(dateStr: string): Date {
  const clean = dateStr.split('T')[0]
  const [y, m, d] = clean.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function calcularIdade(dataNascimento: string | null): number | null {
  if (!dataNascimento) return null
  const hoje = new Date()
  const nasc = parseLocalDate(dataNascimento)
  let idade = hoje.getFullYear() - nasc.getFullYear()
  const m = hoje.getMonth() - nasc.getMonth()
  if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
  return idade
}

export function formatarData(data: string | null): string {
  if (!data) return ''
  return parseLocalDate(data).toLocaleDateString('pt-BR')
}

/** Extrai o dia do mês de uma string de data sem deslocamento de fuso. */
export function getDiaDoMes(dateStr: string): number {
  return parseInt(dateStr.split('T')[0].split('-')[2], 10)
}

export function toNull(value: string | undefined | null): string | null {
  return value === '' || value === undefined ? null : value ?? null
}
