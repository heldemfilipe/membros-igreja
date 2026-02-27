// Cargos eclesiásticos disponíveis
export const CARGOS_ECLESIASTICOS = [
  'Pastor', 'Evangelista', 'Presbítero', 'Diácono',
  'Cooperador', 'Obreiro', 'Missionário', 'Auxiliar', 'Membro',
]

// Cargos dentro dos departamentos
export const CARGOS_DEPARTAMENTO = [
  'Líder', 'Vice-Líder', 'Regente', 'Secretário(a)', 'Tesoureiro(a)',
  'Professor(a)', 'Coordenador(a)', 'Auxiliar', 'Membro',
]

// Cores dos cargos eclesiásticos (igual ao sistema original)
export const CARGO_COLORS: Record<string, { bg: string; text: string }> = {
  'Pastor':       { bg: '#8b3026', text: '#fff' },
  'Evangelista':  { bg: '#162786', text: '#fff' },
  'Presbítero':   { bg: '#1881a1', text: '#fff' },
  'Diácono':      { bg: '#38a038', text: '#fff' },
  'Cooperador':   { bg: '#8d8400', text: '#fff' },
  'Membro':       { bg: '#8f5a1e', text: '#fff' },
  'Obreiro':      { bg: '#5b6e8f', text: '#fff' },
  'Missionário':  { bg: '#4f46e5', text: '#fff' },
  'Auxiliar':     { bg: '#7c8a9e', text: '#fff' },
}

// Retorna o style inline para um badge de cargo
export function getCargoStyle(cargo?: string | null): React.CSSProperties | undefined {
  if (!cargo || !CARGO_COLORS[cargo]) return undefined
  return {
    backgroundColor: CARGO_COLORS[cargo].bg,
    color: CARGO_COLORS[cargo].text,
    borderColor: 'transparent',
  }
}

// ─── Cores de departamentos ───────────────────────────────────────────────────

export const DEPT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#f97316', '#84cc16', '#ec4899', '#14b8a6',
  '#6366f1', '#a855f7', '#22c55e', '#eab308', '#f43f5e',
]

function hashStr(str: string): number {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/** Cor de um departamento pelo ID (numérico) ou nome (string) */
export function getDeptColor(idOrName: number | string): string {
  const idx = typeof idOrName === 'number'
    ? (idOrName - 1)
    : hashStr(String(idOrName))
  return DEPT_COLORS[Math.abs(idx) % DEPT_COLORS.length]
}

/** Style inline para badge de departamento (fundo translúcido + texto colorido) */
export function getDeptBadgeStyle(idOrName: number | string): React.CSSProperties {
  const color = getDeptColor(idOrName)
  return {
    backgroundColor: color + '22',
    color: color,
    borderColor: color + '88',
  }
}

// ─── Permissões do sistema ────────────────────────────────────────────────────

export const PERMISSOES_DISPONIVEIS = [
  { key: 'dashboard',           label: 'Dashboard',              descricao: 'Acessar o painel principal' },
  { key: 'membros_ver',         label: 'Membros — Ver',           descricao: 'Visualizar lista de membros' },
  { key: 'membros_editar',      label: 'Membros — Editar',        descricao: 'Criar e editar membros' },
  { key: 'membros_excluir',     label: 'Membros — Excluir',       descricao: 'Excluir registros de membros' },
  { key: 'membros_exportar',    label: 'Membros — Exportar',      descricao: 'Exportar planilha Excel' },
  { key: 'departamentos_ver',   label: 'Departamentos — Ver',     descricao: 'Visualizar departamentos' },
  { key: 'departamentos_editar', label: 'Departamentos — Editar', descricao: 'Criar e editar departamentos' },
  { key: 'aniversariantes_ver', label: 'Aniversariantes',         descricao: 'Ver aniversariantes' },
] as const

export type PermissaoKey = (typeof PERMISSOES_DISPONIVEIS)[number]['key']
