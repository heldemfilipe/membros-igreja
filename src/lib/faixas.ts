/**
 * Faixas etárias. Por enquanto só o padrão geral; a Fase 3 passa a ler as
 * faixas por congregação do banco, usando o mesmo formato.
 */
export interface FaixaEtaria {
  nome: string
  min: number
  /** null = sem limite superior */
  max: number | null
}

export const FAIXAS_PADRAO: FaixaEtaria[] = [
  { nome: 'Crianças',      min: 0,  max: 11 },
  { nome: 'Adolescentes',  min: 12, max: 17 },
  { nome: 'Jovens',        min: 18, max: 35 },
  { nome: 'Adultos',       min: 36, max: 59 },
  { nome: 'Idosos',        min: 60, max: null },
]

export function faixaDaIdade(faixas: FaixaEtaria[], idade: number): FaixaEtaria | null {
  return faixas.find(f => idade >= f.min && (f.max == null || idade <= f.max)) ?? null
}
