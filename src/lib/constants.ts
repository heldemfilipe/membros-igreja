// Cargos eclesiásticos disponíveis
export const CARGOS_ECLESIASTICOS = [
  'Pastor', 'Evangelista', 'Presbítero', 'Diácono',
  'Cooperador', 'Obreiro',
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

// ─── Bodas de casamento ───────────────────────────────────────────────────────

export const BODAS: { anos: number; nome: string; significado: string }[] = [
  { anos: 1,  nome: 'Bodas de Papel',     significado: 'Como o papel — frágil mas capaz de registrar as mais belas histórias. O primeiro ano pede cuidado e atenção mútua.' },
  { anos: 2,  nome: 'Bodas de Algodão',   significado: 'Macio e resistente, o algodão representa a leveza e o conforto que o casal já conquistou juntos.' },
  { anos: 3,  nome: 'Bodas de Trigo',     significado: 'O trigo simboliza prosperidade e abundância — a relação começa a dar frutos.' },
  { anos: 4,  nome: 'Bodas de Flores',    significado: 'As flores representam o florescimento do amor e o perfume único deste relacionamento.' },
  { anos: 5,  nome: 'Bodas de Madeira',   significado: 'Firme e duradoura. Cinco anos juntos mostram que a base do casal está sólida.' },
  { anos: 6,  nome: 'Bodas de Açúcar',    significado: 'Doçura e leveza — o amor amadurece e se torna cada vez mais saboroso.' },
  { anos: 7,  nome: 'Bodas de Lã',        significado: 'A lã aquece e protege. Sete anos trazem o calor e o cuidado mútuos.' },
  { anos: 8,  nome: 'Bodas de Bronze',    significado: 'Resistente ao tempo, o bronze representa a solidez de um amor que persevera.' },
  { anos: 9,  nome: 'Bodas de Louça',     significado: 'Delicada mas resistente — a louça simboliza o cuidado que ainda se tem pela relação.' },
  { anos: 10, nome: 'Bodas de Estanho',   significado: 'Dez anos moldados juntos — o estanho é maleável, assim como o casal aprendeu a se adaptar.' },
  { anos: 11, nome: 'Bodas de Aço',       significado: 'Forte e inquebrável. A força conquistada por onze anos de parceria.' },
  { anos: 12, nome: 'Bodas de Seda',      significado: 'Fina e preciosa — a seda representa a elegância e a intimidade profunda do casal.' },
  { anos: 13, nome: 'Bodas de Renda',     significado: 'Intrincada e bela como a renda — fruto de muito trabalho e dedicação.' },
  { anos: 14, nome: 'Bodas de Marfim',    significado: 'Raro e valioso — representa a raridade de um amor que chegou tão longe.' },
  { anos: 15, nome: 'Bodas de Cristal',   significado: 'Transparente e brilhante. Cristal simboliza clareza, honestidade e amor renovado.' },
  { anos: 20, nome: 'Bodas de Porcelana', significado: 'Vinte anos de um amor refinado e resistente, como a mais fina porcelana.' },
  { anos: 25, nome: 'Bodas de Prata',     significado: 'Um quarto de século de cumplicidade — brilhante, puro e valioso como a prata.' },
  { anos: 30, nome: 'Bodas de Pérola',    significado: 'A pérola nasce da superação — trinta anos são o resultado de paciência, amor e beleza.' },
  { anos: 35, nome: 'Bodas de Coral',     significado: 'Único e colorido, o coral representa a vitalidade de um casal que chegou longe.' },
  { anos: 40, nome: 'Bodas de Rubi',      significado: 'Intenso e apaixonante como o rubi — quarenta anos de amor são um tesouro incomparável.' },
  { anos: 45, nome: 'Bodas de Safira',    significado: 'Fiel e precioso como a safira — 45 anos demonstram lealdade inabalável.' },
  { anos: 50, nome: 'Bodas de Ouro',      significado: 'Cinquenta anos dourados — o ouro é o símbolo máximo de valor e eternidade do amor.' },
  { anos: 55, nome: 'Bodas de Esmeralda', significado: 'Rara e deslumbrante — a esmeralda celebra 55 anos de um amor excepcional.' },
  { anos: 60, nome: 'Bodas de Diamante',  significado: 'O diamante é eterno, assim como o amor de quem chega aos 60 anos juntos.' },
  { anos: 65, nome: 'Bodas de Ferro',     significado: 'Indestrutível como o ferro — 65 anos de casamento são uma fortaleza de amor e fé.' },
  { anos: 70, nome: 'Bodas de Platina',   significado: 'O metal mais raro e nobre — 70 anos juntos são uma bênção extraordinária.' },
]

export function getBoda(anos: number): { nome: string; significado: string } | null {
  return BODAS.find(b => b.anos === anos) ?? null
}

// ─── Estilos de tipo de participante (shared entre membros e aniversariantes) ─

export const TIPO_STYLE: Record<string, { card: string; avatar: string }> = {
  Membro:     { card: 'border-l-4 border-l-blue-500',    avatar: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  Congregado: { card: 'border-l-4 border-l-emerald-500', avatar: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  Visitante:  { card: 'border-l-4 border-l-amber-500',   avatar: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
}

export const TIPO_STYLE_CASAMENTO: Record<string, { card: string; avatar: string }> = {
  ...TIPO_STYLE,
  _default: { card: 'border-l-4 border-l-rose-400', avatar: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300' },
}

// ─── Abreviações de estado civil ──────────────────────────────────────────────

export const ESTADO_CIVIL_ABREV: Record<string, string> = {
  'Solteiro(a)':  'Solt.',
  'Casado(a)':    'Cas.',
  'Divorciado(a)':'Div.',
  'Viúvo(a)':     'Viúvo',
  'Separado(a)':  'Sep.',
  'União Estável':'U.E.',
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
  { key: 'congregacoes_ver',    label: 'Congregações — Ver',      descricao: 'Ver aba de congregações' },
  { key: 'congregacoes_editar', label: 'Congregações — Editar',   descricao: 'Criar, editar e excluir congregações' },
] as const

export type PermissaoKey = (typeof PERMISSOES_DISPONIVEIS)[number]['key']
