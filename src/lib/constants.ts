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
  { anos:   1, nome: 'Bodas de Papel',           significado: 'O papel simboliza um amor ainda em construção, delicado e cheio de possibilidades, representando o começo de uma história que será escrita a dois ao longo dos anos.' },
  { anos:   2, nome: 'Bodas de Algodão',         significado: 'O algodão simboliza maciez, conforto e resistência, representando um relacionamento que já encontrou sua leveza e o aconchego de quem se conhece de verdade.' },
  { anos:   3, nome: 'Bodas de Trigo',           significado: 'O trigo simboliza prosperidade, colheita e abundância, representando um amor que já começou a dar frutos, construindo juntos um lar fértil e cheio de gratidão.' },
  { anos:   4, nome: 'Bodas de Flores e Frutas', significado: 'As flores e frutas simbolizam beleza e renovação contínua, representando um amor que floresce e amadurece a cada estação, colorindo a vida do casal com alegria.' },
  { anos:   5, nome: 'Bodas de Madeira',         significado: 'A madeira simboliza firmeza, raiz e durabilidade, representando um amor que já estabeleceu bases sólidas e pode resistir ao tempo, ao vento e às intempéries da vida.' },
  { anos:   6, nome: 'Bodas de Perfume',         significado: 'O perfume simboliza delicadeza, presença e memória afetiva, representando um amor que deixa marcas suaves e inesquecíveis em cada momento compartilhado.' },
  { anos:   7, nome: 'Bodas de Latão',           significado: 'O latão simboliza resistência e brilho duradouro, representando um amor que, mesmo diante das adversidades, mantém seu brilho e sua força ao longo do tempo.' },
  { anos:   8, nome: 'Bodas de Barro',           significado: 'O barro simboliza criação, paciência e moldagem mútua, representando um amor construído com as mãos, esculpido no cotidiano e cheio de intenção e cuidado.' },
  { anos:   9, nome: 'Bodas de Cerâmica',        significado: 'A cerâmica simboliza resistência ao fogo e à pressão, representando um amor que se fortaleceu a cada desafio, saindo de cada provação mais belo e mais sólido.' },
  { anos:  10, nome: 'Bodas de Estanho',         significado: 'O estanho simboliza maleabilidade e adaptação, representando um amor que aprendeu a se moldar às mudanças da vida, sem perder sua essência e sua firmeza.' },
  { anos:  11, nome: 'Bodas de Aço',             significado: 'O aço simboliza força, dureza e inquebrabilidade, representando um amor que se tornou sólido como metal, capaz de sustentar qualquer peso e resistir a qualquer pressão.' },
  { anos:  12, nome: 'Bodas de Seda',            significado: 'A seda simboliza elegância, suavidade e preciosidade, representando uma união que amadureceu com refinamento, onde cada gesto é marcado pela ternura e pela cumplicidade.' },
  { anos:  13, nome: 'Bodas de Renda',           significado: 'A renda simboliza delicadeza, arte e paciência, representando um amor tecido fio a fio, com cuidado e dedicação, formando um laço único e belo entre duas pessoas.' },
  { anos:  14, nome: 'Bodas de Marfim',          significado: 'O marfim simboliza raridade, valor e nobreza, representando um amor que chegou até aqui com elegância, sendo reconhecido como algo precioso e incomum no mundo.' },
  { anos:  15, nome: 'Bodas de Cristal',         significado: 'O cristal simboliza transparência, clareza e brilho, representando um amor puro e honesto que, ao refletir a luz, ilumina todos ao redor com sua beleza e autenticidade.' },
  { anos:  16, nome: 'Bodas de Turmalina',       significado: 'A turmalina simboliza proteção, energia e diversidade de cores, representando um amor que se expressa de mil formas diferentes, sempre renovado e cheio de vida.' },
  { anos:  17, nome: 'Bodas de Rosa',            significado: 'A rosa simboliza amor, beleza e renovação, representando um sentimento que, mesmo após tantos anos, continua florescendo com a mesma intensidade e frescor do início.' },
  { anos:  18, nome: 'Bodas de Turquesa',        significado: 'A turquesa simboliza proteção, equilíbrio e fortalecimento da união, representando um relacionamento maduro, marcado por cumplicidade e estabilidade conquistada.' },
  { anos:  19, nome: 'Bodas de Cretone',         significado: 'O cretone é um tecido resistente e versátil, simbolizando a durabilidade e flexibilidade do casal, representando uma união que soube se adaptar e permanecer firme ao longo dos anos.' },
  { anos:  20, nome: 'Bodas de Porcelana',       significado: 'A porcelana simboliza refinamento, resistência e beleza duradoura, representando vinte anos de um amor que, mesmo delicado na aparência, possui uma força interior admirável.' },
  { anos:  21, nome: 'Bodas de Zircão',          significado: 'O zircão simboliza brilho intenso e durabilidade, representando um amor que, ao completar duas décadas, reluz com toda sua intensidade e valor, semelhante ao diamante.' },
  { anos:  22, nome: 'Bodas de Louça',           significado: 'A louça simboliza cuidado, beleza doméstica e resistência, representando um amor que soube preservar a delicadeza do lar e a harmonia do cotidiano por mais de vinte anos.' },
  { anos:  23, nome: 'Bodas de Palha',           significado: 'A palha simboliza simplicidade, utilidade e humildade, representando um amor que encontra valor nas pequenas coisas e sabe ser grato por tudo que foi construído juntos.' },
  { anos:  24, nome: 'Bodas de Opala',           significado: 'A opala simboliza fidelidade, esperança e renovação, representando uma união sólida, cheia de experiências compartilhadas e amadurecida ao longo do tempo.' },
  { anos:  25, nome: 'Bodas de Prata',           significado: 'A prata simboliza pureza, brilho e valor, representando um quarto de século de cumplicidade, respeito e amor genuíno — uma conquista que merece ser celebrada com orgulho.' },
  { anos:  26, nome: 'Bodas de Alexandrita',     significado: 'A alexandrita muda de cor conforme a luz, simbolizando adaptabilidade e surpresa, representando um amor que se reinventa a cada ano, mantendo-se sempre encantador e vivo.' },
  { anos:  27, nome: 'Bodas de Crisoprásio',     significado: 'O crisoprásio simboliza esperança, prosperidade e renovação, representando um amor que, em tons dourado-esverdeados, ainda guarda a frescura e a vitalidade de quem caminha junto.' },
  { anos:  28, nome: 'Bodas de Hematita',        significado: 'A hematita simboliza proteção, coragem e enraizamento, representando um amor que construiu uma base inabalável, capaz de proteger e sustentar a família ao longo das décadas.' },
  { anos:  29, nome: 'Bodas de Erva',            significado: 'A erva simboliza vitalidade, crescimento e renovação constante, representando um amor que, mesmo após tantos anos, continua verde, vivo e capaz de se renovar a cada dia.' },
  { anos:  30, nome: 'Bodas de Pérola',          significado: 'A pérola nasce da paciência e da superação, simbolizando beleza que emerge do esforço, representando trinta anos de um amor que se lapidou com o tempo e brilha com nobreza.' },
  { anos:  31, nome: 'Bodas de Nácar',           significado: 'O nácar simboliza iridescência, preciosidade e múltiplos reflexos, representando um amor que, em cada ângulo, revela uma nova faceta bela e surpreendente.' },
  { anos:  32, nome: 'Bodas de Pinho',           significado: 'O pinho simboliza longevidade, resistência e verde perene, representando um amor que permanece vivo e forte em todas as estações, nunca perdendo sua essência e vigor.' },
  { anos:  33, nome: 'Bodas de Crizopala',       significado: 'A crizopala simboliza paciência, solidez e brilho revelado pelo tempo, representando um amor que se tornou mais valioso a cada ano, reluzindo com a beleza construída ao longo de décadas.' },
  { anos:  34, nome: 'Bodas de Oliveira',        significado: 'A oliveira simboliza paz, longevidade e abundância, representando um amor que plantou raízes profundas, deu frutos generosos e se tornou símbolo de sabedoria e bênção.' },
  { anos:  35, nome: 'Bodas de Coral',           significado: 'O coral simboliza vitalidade, beleza e riqueza natural, representando um amor colorido e único que, após mais de três décadas, ainda encanta por sua vivacidade e profundidade.' },
  { anos:  36, nome: 'Bodas de Cedro',           significado: 'O cedro simboliza nobreza, perfume e resistência ao tempo, representando um amor de aroma inconfundível que se mantém íntegro, majestoso e respeitável após tantos anos.' },
  { anos:  37, nome: 'Bodas de Aventurina',      significado: 'A aventurina simboliza sorte, prosperidade e otimismo, representando um amor abençoado que soube aproveitar as oportunidades da vida e colher frutos ao longo de quase quatro décadas.' },
  { anos:  38, nome: 'Bodas de Carvalho',        significado: 'O carvalho simboliza força, majestade e longevidade, representando um amor que cresceu como uma grande árvore — de raízes firmes, tronco sólido e copa que abriga e acolhe.' },
  { anos:  39, nome: 'Bodas de Mármore',         significado: 'O mármore simboliza firmeza, durabilidade e beleza que resiste ao tempo, representando um relacionamento sólido, estável e admirável após tantos anos de união e dedicação.' },
  { anos:  40, nome: 'Bodas de Rubi',            significado: 'O rubi simboliza paixão, intensidade e valor inestimável, representando quarenta anos de um amor ardente que, longe de se apagar, brilha com a força de uma pedra preciosa rara.' },
  { anos:  41, nome: 'Bodas de Seda Dourada',    significado: 'A seda dourada simboliza refinamento e riqueza interior, representando um amor que, renovado e mais luminoso após décadas, celebra a elegância de quem percorreu um longo e belo caminho.' },
  { anos:  42, nome: 'Bodas de Prata Dourada',   significado: 'A prata dourada simboliza a fusão de pureza e valor máximo, representando um amor que já tem a leveza e o brilho da prata, mas começa a resplandecer com a magnitude do ouro.' },
  { anos:  43, nome: 'Bodas de Azeviche',        significado: 'O azeviche simboliza elegância sóbria, profundidade e brilho discreto, representando um amor consolidado que não precisa de exibição para demonstrar toda a sua grandeza e nobreza.' },
  { anos:  44, nome: 'Bodas de Carbonato',       significado: 'O carbonato simboliza a base essencial da vida e da natureza, representando as raízes sólidas e inabaláveis que sustentam este amor há mais de quatro décadas de convivência e fé.' },
  { anos:  45, nome: 'Bodas de Platina',         significado: 'A platina simboliza raridade, resistência e valor supremo, representando quarenta e cinco anos de um amor que poucos alcançam — puro, indestrutível e de valor incomparável.' },
  { anos:  46, nome: 'Bodas de Alabastro',       significado: 'O alabastro simboliza pureza, delicadeza e luminosidade, representando um amor que, mesmo após décadas, mantém sua transparência, sua leveza e sua beleza singular.' },
  { anos:  47, nome: 'Bodas de Jaspe',           significado: 'O jaspe simboliza proteção, coragem e estabilidade, representando um amor que ampara, cuida e fortalece, sendo presença segura e constante ao longo de quase cinco décadas.' },
  { anos:  48, nome: 'Bodas de Granito',         significado: 'O granito simboliza solidez, resistência e durabilidade extrema, representando um amor construído como rocha — firme, confiável e capaz de atravessar qualquer tempestade sem se partir.' },
  { anos:  49, nome: 'Bodas de Heliotrópio',     significado: 'O heliotrópio simboliza orientação, esperança e busca pela luz, representando um amor que, em seus quase cinquenta anos, sempre se voltou para o bem, a fé e a alegria de estar junto.' },
  { anos:  50, nome: 'Bodas de Ouro',            significado: 'O ouro simboliza valor eterno, pureza e conquista máxima, representando cinquenta anos de um amor que se tornou testemunho vivo de fidelidade, graça e bênção incomparável.' },
  { anos:  55, nome: 'Bodas de Esmeralda',       significado: 'A esmeralda simboliza esperança, renovação e vida abundante, representando cinquenta e cinco anos de um amor que permanece verde e vibrante, cheio de fé no amanhã.' },
  { anos:  60, nome: 'Bodas de Diamante',        significado: 'O diamante simboliza eternidade, inquebrabilidade e brilho que nada apaga, representando sessenta anos de um amor que resistiu a tudo e se tornou a joia mais preciosa de uma vida.' },
  { anos:  65, nome: 'Bodas de Safira',          significado: 'A safira simboliza lealdade, sabedoria e serenidade, representando sessenta e cinco anos de um amor fiel, profundo e sereno, construído sobre um alicerce de graça e compromisso.' },
  { anos:  70, nome: 'Bodas de Platina Dupla',   significado: 'Rara e de valor supremo, a platina dupla representa setenta anos de um amor que transcende qualquer medida humana, sendo símbolo de bênção divina e dedicação de uma vida inteira.' },
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
  { key: 'registros_ver',       label: 'Registros — Ver',         descricao: 'Ver completude de datas (nascimento e casamento)' },
  { key: 'registros_editar',    label: 'Registros — Editar',      descricao: 'Editar datas de nascimento e casamento diretamente' },
] as const

export type PermissaoKey = (typeof PERMISSOES_DISPONIVEIS)[number]['key']
