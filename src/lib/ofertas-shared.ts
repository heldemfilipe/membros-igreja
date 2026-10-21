/**
 * Partes de ofertas seguras para o navegador (tipos, formatação de dinheiro).
 * Regras de acesso e gravação ficam em lib/ofertas.ts.
 */

export const TIPOS_OFERTA = [
  { key: 'dizimos', label: 'Dízimos' },
  { key: 'ofertas', label: 'Ofertas' },
  { key: 'missoes', label: 'Missões' },
  { key: 'outros',  label: 'Outros' },
] as const

export type TipoOferta = (typeof TIPOS_OFERTA)[number]['key']

export const TIPO_LABEL: Record<TipoOferta, string> = Object.fromEntries(
  TIPOS_OFERTA.map(t => [t.key, t.label]),
) as Record<TipoOferta, string>

/** Dias em que quem lançou ainda pode corrigir sem a permissão de editar. */
export const JANELA_EDICAO_DIAS = 7

/** "1.234,56" / "1234.56" / "1234,5" → centavos (inteiro). null se inválido. */
export function parseValorBR(texto: string): number | null {
  const t = texto.trim().replace(/\s|R\$/g, '')
  if (!t) return 0
  // Com vírgula: ponto é separador de milhar. Sem vírgula: ponto é decimal.
  const normal = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  if (!/^\d+(\.\d{1,2})?$/.test(normal)) return null
  return Math.round(Number(normal) * 100)
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function formatarBRL(valor: number | string): string {
  return BRL.format(Number(valor) || 0)
}

/** Centavos → "1.234,56" (para preencher campos de edição). */
export function centavosParaTexto(centavos: number): string {
  return (centavos / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export interface OfertaItemEntrada {
  tipo: TipoOferta
  /** em centavos */
  valor: number
  membro_id?: number | null
  pessoa_pendente_id?: number | null
  /** pessoa sem cadastro: entra na lista de pendentes */
  nova_pessoa?: { nome: string; telefone?: string | null } | null
}
