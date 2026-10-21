/**
 * Partes de faixas etárias seguras para o navegador (sem pg/zod/next).
 * Regras de validação e acesso ao banco ficam em lib/faixas.ts.
 */
export interface FaixaEtaria {
  nome: string
  min: number
  /** null = sem limite superior */
  max: number | null
}

/** Padrão de fábrica — usado se o banco ainda não tiver o padrão geral. */
export const FAIXAS_PADRAO: FaixaEtaria[] = [
  { nome: 'Crianças',      min: 0,  max: 11 },
  { nome: 'Adolescentes',  min: 12, max: 17 },
  { nome: 'Jovens',        min: 18, max: 35 },
  { nome: 'Adultos',       min: 36, max: 59 },
  { nome: 'Idosos',        min: 60, max: null },
]

export const MAX_FAIXAS = 10

export function faixaDaIdade(faixas: FaixaEtaria[], idade: number): FaixaEtaria | null {
  return faixas.find(f => idade >= f.min && (f.max == null || idade <= f.max)) ?? null
}

/** "12–17 anos" / "60+ anos" */
export function descreverFaixa(f: FaixaEtaria): string {
  return f.max == null ? `${f.min}+ anos` : `${f.min}–${f.max} anos`
}

