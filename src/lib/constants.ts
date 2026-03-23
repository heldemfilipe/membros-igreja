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
  { anos:  1, nome: 'Bodas de Papel',       significado: 'Como o papel, frágil mas capaz de registrar as mais belas histórias. O primeiro ano pede cuidado e atenção mútua.' },
  { anos:  2, nome: 'Bodas de Algodão',     significado: 'Macio e resistente, o algodão representa a leveza e o conforto que o casal já conquistou juntos.' },
  { anos:  3, nome: 'Bodas de Trigo',       significado: 'O trigo simboliza prosperidade e abundância — a relação começa a dar frutos.' },
  { anos:  4, nome: 'Bodas de Flores',      significado: 'As flores representam o florescimento do amor e o perfume único deste relacionamento.' },
  { anos:  5, nome: 'Bodas de Madeira',     significado: 'Firme e duradoura. Cinco anos juntos mostram que a base do casal está sólida.' },
  { anos:  6, nome: 'Bodas de Açúcar',      significado: 'Doçura e leveza — o amor amadurece e se torna cada vez mais saboroso.' },
  { anos:  7, nome: 'Bodas de Lã',          significado: 'A lã aquece e protege. Sete anos trazem o calor e o cuidado mútuos.' },
  { anos:  8, nome: 'Bodas de Bronze',      significado: 'Resistente ao tempo, o bronze representa a solidez de um amor que persevera.' },
  { anos:  9, nome: 'Bodas de Louça',       significado: 'Delicada mas resistente — a louça simboliza o cuidado que ainda se tem pela relação.' },
  { anos: 10, nome: 'Bodas de Estanho',     significado: 'Dez anos moldados juntos — o estanho é maleável, assim como o casal aprendeu a se adaptar.' },
  { anos: 11, nome: 'Bodas de Aço',         significado: 'Forte e inquebrável. A força conquistada por onze anos de parceria.' },
  { anos: 12, nome: 'Bodas de Seda',        significado: 'Fina e preciosa — a seda representa a elegância e a intimidade profunda do casal.' },
  { anos: 13, nome: 'Bodas de Renda',       significado: 'Intrincada e bela como a renda — fruto de muito trabalho e dedicação.' },
  { anos: 14, nome: 'Bodas de Marfim',      significado: 'Raro e valioso — representa a raridade de um amor que chegou tão longe.' },
  { anos: 15, nome: 'Bodas de Cristal',     significado: 'Transparente e brilhante. Cristal simboliza clareza, honestidade e amor renovado.' },
  { anos: 16, nome: 'Bodas de Topázio',     significado: 'Brilhante e variado em tons — o topázio celebra a riqueza das experiências vividas juntos.' },
  { anos: 17, nome: 'Bodas de Rosa',        significado: 'A rosa simboliza o amor que continua florescendo a cada ano, ainda tão vivo quanto no início.' },
  { anos: 18, nome: 'Bodas de Turquesa',    significado: 'Azul como o céu e o mar — a turquesa representa serenidade, confiança e proteção mútua.' },
  { anos: 19, nome: 'Bodas de Crisólita',   significado: 'Pedra de luz dourada — celebra a clareza e o calor que o amor construiu ao longo dos anos.' },
  { anos: 20, nome: 'Bodas de Porcelana',   significado: 'Vinte anos de um amor refinado e resistente, como a mais fina porcelana.' },
  { anos: 21, nome: 'Bodas de Ônix',        significado: 'Escuro e misterioso como o ônix — representa a profundidade e a beleza única deste amor.' },
  { anos: 22, nome: 'Bodas de Cobre',       significado: 'Condutor de energia e calor — o cobre simboliza a corrente de amor que flui entre o casal.' },
  { anos: 23, nome: 'Bodas de Berílio',     significado: 'Leve e resistente, o berílio representa a combinação perfeita de força e delicadeza.' },
  { anos: 24, nome: 'Bodas de Cetim',       significado: 'Suave ao toque e luminoso — o cetim celebra a ternura e a elegância construídas ao longo dos anos.' },
  { anos: 25, nome: 'Bodas de Prata',       significado: 'Um quarto de século de cumplicidade — brilhante, puro e valioso como a prata.' },
  { anos: 26, nome: 'Bodas de Jade',        significado: 'Símbolo de sabedoria e longevidade — o jade celebra um amor que atravessa gerações.' },
  { anos: 27, nome: 'Bodas de Âmbar',       significado: 'Guardião de histórias ao longo do tempo — o âmbar representa memórias preciosas e amor duradouro.' },
  { anos: 28, nome: 'Bodas de Níquel',      significado: 'Resistente e versátil — representa a capacidade do casal de se adaptar a qualquer desafio.' },
  { anos: 29, nome: 'Bodas de Veludo',      significado: 'Suave e aconchegante — o veludo celebra a intimidade e o carinho que só anos juntos podem construir.' },
  { anos: 30, nome: 'Bodas de Pérola',      significado: 'A pérola nasce da superação — trinta anos são o resultado de paciência, amor e beleza.' },
  { anos: 31, nome: 'Bodas de Pórfiro',     significado: 'Pedra nobre de reis — representa a majestade de um amor que já superou tantas estações.' },
  { anos: 32, nome: 'Bodas de Cobre-Rosa',  significado: 'A fusão do cobre com tons rosados simboliza um amor que uniu força e romantismo de forma única.' },
  { anos: 33, nome: 'Bodas de Ametista',    significado: 'Roxo e espiritual — a ametista simboliza proteção divina e paz no lar construído a dois.' },
  { anos: 34, nome: 'Bodas de Âmbar-Ouro', significado: 'Um anos de amadurecimento dourado — o casal brilha com a sabedoria conquistada ao longo do caminho.' },
  { anos: 35, nome: 'Bodas de Coral',       significado: 'Único e colorido, o coral representa a vitalidade de um casal que chegou longe.' },
  { anos: 36, nome: 'Bodas de Alabastro',   significado: 'Branco e translúcido como a luz — representa a pureza e a luminosidade de um amor sólido.' },
  { anos: 37, nome: 'Bodas de Berilo-Azul', significado: 'Azul como o horizonte sem fim — simboliza que há ainda muito a descobrir e viver juntos.' },
  { anos: 38, nome: 'Bodas de Mercúrio',    significado: 'Fluido e brilhante — representa a comunicação e a sintonia que o casal desenvolveu ao longo dos anos.' },
  { anos: 39, nome: 'Bodas de Granito',     significado: 'Forte e duradouro como o granito — nada abala um amor que chegou tão longe.' },
  { anos: 40, nome: 'Bodas de Rubi',        significado: 'Intenso e apaixonante como o rubi — quarenta anos de amor são um tesouro incomparável.' },
  { anos: 41, nome: 'Bodas de Opala',       significado: 'Multicolorida e única — a opala celebra a riqueza de experiências que formam este relacionamento.' },
  { anos: 42, nome: 'Bodas de Tanzanita',   significado: 'Rara e encontrada em um único lugar no mundo — assim como este amor, extraordinário e insubstituível.' },
  { anos: 43, nome: 'Bodas de Feldspato',   significado: 'Base de toda rocha — o feldspato simboliza que este amor é fundamento sólido de uma vida inteira.' },
  { anos: 44, nome: 'Bodas de Topázio-Imperial', significado: 'O mais raro dos topázios — celebra um amor que só se torna mais precioso com o tempo.' },
  { anos: 45, nome: 'Bodas de Safira',      significado: 'Fiel e precioso como a safira — 45 anos demonstram lealdade inabalável.' },
  { anos: 46, nome: 'Bodas de Malaquita',   significado: 'Verde como a esperança e a vida — a malaquita celebra um amor que ainda cresce e se renova.' },
  { anos: 47, nome: 'Bodas de Heliodoro',   significado: 'Pedra solar de luz dourada — representa o brilho constante que este amor projeta ao redor.' },
  { anos: 48, nome: 'Bodas de Alexandrita', significado: 'Muda de cor à luz — representa a capacidade do casal de se reinventar e surpreender a cada ano.' },
  { anos: 49, nome: 'Bodas de Cedro',       significado: 'Nobre e perfumado — o cedro simboliza a dignidade e o aroma inconfundível de um grande amor.' },
  { anos: 50, nome: 'Bodas de Ouro',        significado: 'Cinquenta anos dourados — o ouro é o símbolo máximo de valor e eternidade do amor.' },
  { anos: 51, nome: 'Bodas de Opala-Negra', significado: 'A mais valiosa das opalas — celebra um amor que, aos 51 anos, é verdadeiramente excepcional.' },
  { anos: 52, nome: 'Bodas de Jade-Imperial', significado: 'O jade mais raro do mundo — assim como este casamento, uma raridade a ser celebrada com reverência.' },
  { anos: 53, nome: 'Bodas de Turmalina',   significado: 'Colorida e protetora — a turmalina celebra décadas de cuidado, proteção e amor verdadeiro.' },
  { anos: 54, nome: 'Bodas de Kunzita',     significado: 'Pedra do amor incondicional — a kunzita celebra um amor que transcende o tempo e as dificuldades.' },
  { anos: 55, nome: 'Bodas de Esmeralda',   significado: 'Rara e deslumbrante — a esmeralda celebra 55 anos de um amor excepcional.' },
  { anos: 56, nome: 'Tanzanita-Azul',       significado: 'Azul profundo como a eternidade — simboliza que este amor já é uma lenda de fé e perseverança.' },
  { anos: 57, nome: 'Bodas de Safira-Rosa', significado: 'A delicadeza da safira rosa celebra décadas de ternura, romantismo e cumplicidade.' },
  { anos: 58, nome: 'Bodas de Ágata',       significado: 'Firme e formada por camadas — cada camada representa um ano de amor acumulado e precioso.' },
  { anos: 59, nome: 'Bodas de Zircão',      significado: 'Brilha como o diamante — este amor, às vésperas dos 60 anos, já tem o valor de uma joia rara.' },
  { anos: 60, nome: 'Bodas de Diamante',    significado: 'O diamante é eterno, assim como o amor de quem chega aos 60 anos juntos. Uma bênção incomparável.' },
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
