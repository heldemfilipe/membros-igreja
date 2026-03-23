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
  { anos:   1, nome: 'Bodas de Papel',          significado: 'Como o papel, frágil mas capaz de registrar as mais belas histórias. O primeiro ano pede cuidado e atenção mútua.' },
  { anos:   2, nome: 'Bodas de Algodão',         significado: 'Macio e resistente, o algodão representa a leveza e o conforto que o casal já conquistou juntos.' },
  { anos:   3, nome: 'Bodas de Trigo',           significado: 'O trigo simboliza prosperidade e abundância — a relação começa a dar frutos.' },
  { anos:   4, nome: 'Bodas de Flores',          significado: 'As flores representam o florescimento do amor e o perfume único deste relacionamento.' },
  { anos:   5, nome: 'Bodas de Madeira',         significado: 'Firme e duradoura. Cinco anos juntos mostram que a base do casal está sólida.' },
  { anos:   6, nome: 'Bodas de Açúcar',          significado: 'Doçura e leveza — o amor amadurece e se torna cada vez mais saboroso.' },
  { anos:   7, nome: 'Bodas de Lã',              significado: 'A lã aquece e protege. Sete anos trazem o calor e o cuidado mútuos.' },
  { anos:   8, nome: 'Bodas de Barro',           significado: 'Moldado com as mãos, o barro representa um amor que se forma no trabalho conjunto do dia a dia.' },
  { anos:   9, nome: 'Bodas de Cerâmica',        significado: 'Resistente ao fogo — a cerâmica simboliza um amor que se fortalece a cada provação.' },
  { anos:  10, nome: 'Bodas de Estanho',         significado: 'Dez anos moldados juntos — o estanho é maleável, assim como o casal aprendeu a se adaptar.' },
  { anos:  11, nome: 'Bodas de Aço',             significado: 'Forte e inquebrável. A força conquistada por onze anos de parceria.' },
  { anos:  12, nome: 'Bodas de Seda',            significado: 'Fina e preciosa — a seda representa a elegância e a intimidade profunda do casal.' },
  { anos:  13, nome: 'Bodas de Linho',           significado: 'Simples e nobre — o linho representa a autenticidade e a naturalidade de um amor verdadeiro.' },
  { anos:  14, nome: 'Bodas de Marfim',          significado: 'Raro e valioso — representa a raridade de um amor que chegou tão longe.' },
  { anos:  15, nome: 'Bodas de Cristal',         significado: 'Transparente e brilhante. Cristal simboliza clareza, honestidade e amor renovado.' },
  { anos:  16, nome: 'Bodas de Turmalina',       significado: 'Colorida e protetora, a turmalina simboliza a variedade de cores e experiências que este amor viveu.' },
  { anos:  17, nome: 'Bodas de Rosa',            significado: 'A rosa simboliza o amor que continua florescendo a cada ano, ainda tão vivo quanto no início.' },
  { anos:  18, nome: 'Bodas de Turquesa',        significado: 'Azul como o céu e o mar — a turquesa representa serenidade, confiança e proteção mútua.' },
  { anos:  19, nome: 'Bodas de Água-marinha',    significado: 'Tranquila e profunda como o mar — a água-marinha celebra a harmonia e a profundidade emocional deste amor.' },
  { anos:  20, nome: 'Bodas de Porcelana',       significado: 'Vinte anos de um amor refinado e resistente, como a mais fina porcelana.' },
  { anos:  21, nome: 'Bodas de Zircão',          significado: 'Brilhante como o diamante — o zircão celebra um amor que já reluz com toda sua intensidade.' },
  { anos:  22, nome: 'Bodas de Louça',           significado: 'Delicada mas resistente — a louça simboliza o cuidado e a beleza que o casal preserva em seu lar.' },
  { anos:  23, nome: 'Bodas de Palha',           significado: 'Simples e essencial — a palha representa a humildade e a gratidão por tudo que foi construído juntos.' },
  { anos:  24, nome: 'Bodas de Opala',           significado: 'Multicolorida e única — a opala celebra a riqueza de experiências que formam este relacionamento.' },
  { anos:  25, nome: 'Bodas de Prata',           significado: 'Um quarto de século de cumplicidade — brilhante, puro e valioso como a prata.' },
  { anos:  26, nome: 'Bodas de Alexandrita',     significado: 'Muda de cor à luz — representa a capacidade do casal de se reinventar e surpreender a cada ano.' },
  { anos:  27, nome: 'Bodas de Crisopázio',      significado: 'Pedra de tons dourado-esverdeados — simboliza a prosperidade e a esperança que este amor ainda carrega.' },
  { anos:  28, nome: 'Bodas de Hematita',        significado: 'Cinza e metálica como o ferro — a hematita representa proteção, coragem e estabilidade conquistadas.' },
  { anos:  29, nome: 'Bodas de Erva',            significado: 'Verde e renovável — a erva representa vitalidade, crescimento contínuo e frescor no amor.' },
  { anos:  30, nome: 'Bodas de Pérola',          significado: 'A pérola nasce da superação — trinta anos são o resultado de paciência, amor e beleza.' },
  { anos:  31, nome: 'Bodas de Nácar',           significado: 'Iridescente e precioso — o nácar celebra o brilho multifacetado de um amor que viu muitas fases.' },
  { anos:  32, nome: 'Bodas de Pinho',           significado: 'Resistente e sempre verde — o pinho representa um amor que permanece vivo e forte em todas as estações.' },
  { anos:  33, nome: 'Bodas de Crizo',           significado: 'Pedra de brilho dourado — o crizo representa a paciência, a solidez e a beleza revelada pelo tempo.' },
  { anos:  34, nome: 'Bodas de Oliveira',        significado: 'Símbolo de paz e longevidade — a oliveira representa um amor que deu frutos e plantou raízes profundas.' },
  { anos:  35, nome: 'Bodas de Coral',           significado: 'Único e colorido, o coral representa a vitalidade de um casal que chegou longe.' },
  { anos:  36, nome: 'Bodas de Cedro',           significado: 'Nobre e perfumado — o cedro simboliza a dignidade e o aroma inconfundível de um grande amor.' },
  { anos:  37, nome: 'Bodas de Aventurina',      significado: 'Pedra da sorte e da prosperidade — a aventurina celebra as bênçãos que este amor trouxe ao longo dos anos.' },
  { anos:  38, nome: 'Bodas de Carvalho',        significado: 'Forte, majestoso e duradouro — o carvalho simboliza um amor que cresceu como uma grande árvore.' },
  { anos:  39, nome: 'Bodas de Mármore',         significado: 'Nobre e eterno — o mármore representa a beleza e a solidez de um amor que resistiu ao tempo.' },
  { anos:  40, nome: 'Bodas de Esmeralda',       significado: 'Verde e deslumbrante como a esmeralda — quarenta anos de amor são uma riqueza incomparável.' },
  { anos:  41, nome: 'Bodas de Seda',            significado: 'De volta à seda — mais madura e luminosa, celebra a renovação do amor depois de décadas juntos.' },
  { anos:  42, nome: 'Bodas de Prata Dourada',   significado: 'A fusão da prata com o ouro — representa um amor que já tem a pureza da prata e começa a brilhar como ouro.' },
  { anos:  43, nome: 'Bodas de Azeviche',        significado: 'Negro e brilhante como o azeviche — representa a elegância sóbria de um amor profundo e consolidado.' },
  { anos:  44, nome: 'Bodas de Carbonato',       significado: 'Base da vida e da natureza — o carbonato representa as raízes sólidas que sustentam este amor há décadas.' },
  { anos:  45, nome: 'Bodas de Rubi',            significado: 'Intenso e apaixonante como o rubi — quarenta e cinco anos de amor são um tesouro incomparável.' },
  { anos:  46, nome: 'Bodas de Alabastro',       significado: 'Branco e translúcido como a luz — representa a pureza e a luminosidade de um amor sólido.' },
  { anos:  47, nome: 'Bodas de Jaspe',           significado: 'Pedra da proteção e da coragem — o jaspe simboliza um amor que protege, cuida e ampara a cada dia.' },
  { anos:  48, nome: 'Bodas de Granada',         significado: 'Vermelha e apaixonada — a granada celebra o fogo e a paixão que ainda ardем após quase cinco décadas.' },
  { anos:  49, nome: 'Bodas de Heliotrópio',     significado: 'Pedra que segue o sol — representa um amor que sempre se orienta para a luz, a esperança e o bem.' },
  { anos:  50, nome: 'Bodas de Ouro',            significado: 'Cinquenta anos dourados — o ouro é o símbolo máximo de valor e eternidade do amor.' },
  { anos:  51, nome: 'Bodas de Bronze',          significado: 'Resistente e duradouro como o bronze — este amor já é monumento de fé e dedicação.' },
  { anos:  52, nome: 'Bodas de Argila',          significado: 'Moldada com paciência e carinho — a argila representa um amor que continua sendo esculpido a dois.' },
  { anos:  53, nome: 'Bodas de Antimônio',       significado: 'Raro e precioso — o antimônio celebra um amor tão singular que poucos alcançam.' },
  { anos:  54, nome: 'Bodas de Níquel',          significado: 'Resistente e versátil — representa a capacidade do casal de se adaptar e superar qualquer desafio.' },
  { anos:  55, nome: 'Bodas de Ametista',        significado: 'Espiritual e protetora — a ametista simboliza a paz, a fé e a proteção divina sobre este lar.' },
  { anos:  56, nome: 'Bodas de Malaquita',       significado: 'Verde como a esperança e a vida — a malaquita celebra um amor que ainda cresce e se renova.' },
  { anos:  57, nome: 'Bodas de Lápis-Lazúli',   significado: 'Azul profundo como o céu — o lápis-lazúli representa a sabedoria e a tranquilidade conquistadas juntos.' },
  { anos:  58, nome: 'Bodas de Vidro',           significado: 'Transparente e refletor — o vidro simboliza a honestidade e a clareza de um amor que não esconde nada.' },
  { anos:  59, nome: 'Bodas de Cereja',          significado: 'Doce e vibrante — a cereja celebra a alegria de estar quase na marca dos 60 anos, com o coração jovem.' },
  { anos:  60, nome: 'Bodas de Diamante',        significado: 'O diamante é eterno, assim como o amor de quem chega aos 60 anos juntos. Uma bênção incomparável.' },
  { anos:  61, nome: 'Bodas de Cobre',           significado: 'Condutor de calor e energia — o cobre simboliza a corrente de amor que nunca parou de fluir entre o casal.' },
  { anos:  62, nome: 'Bodas de Telúrio',         significado: 'Elemento raro da terra — o telúrio celebra um amor tão raro quanto precioso, testemunha de uma vida inteira.' },
  { anos:  63, nome: 'Bodas de Sândalo',         significado: 'Perfumado e sagrado — o sândalo representa a espiritualidade e o aroma de uma história de amor única.' },
  { anos:  64, nome: 'Bodas de Fabulita',        significado: 'Pedra que imita o diamante — celebra um amor que possui toda a beleza e valor de um diamante verdadeiro.' },
  { anos:  65, nome: 'Bodas de Safira',          significado: 'Fiel e precioso como a safira — 65 anos demonstram uma lealdade que poucos podem imaginar.' },
  { anos:  66, nome: 'Bodas de Ébano',           significado: 'Escuro e nobre como o ébano — representa a profundidade e a elegância de um amor que atravessou décadas.' },
  { anos:  67, nome: 'Bodas de Neve',            significado: 'Pura e silenciosa — a neve simboliza a paz, a leveza e a beleza serena de um amor maduro.' },
  { anos:  68, nome: 'Bodas de Chumbo',          significado: 'Pesado e resistente — o chumbo representa o peso da história vivida juntos e a solidez inabalável do casal.' },
  { anos:  69, nome: 'Bodas de Mercúrio',        significado: 'Fluido e brilhante — representa a comunicação e a sintonia que décadas de convivência construíram.' },
  { anos:  70, nome: 'Bodas de Vinho',           significado: 'Como o bom vinho, melhora com o tempo — setenta anos de amor são a mais nobre das safras.' },
  { anos:  71, nome: 'Bodas de Zinco',           significado: 'Protetor e durável — o zinco simboliza o escudo de amor que o casal construiu para proteger sua família.' },
  { anos:  72, nome: 'Bodas de Aveia',           significado: 'Simples e nutritiva — a aveia representa o sustento, o cuidado diário e a saúde de um amor que alimenta a alma.' },
  { anos:  73, nome: 'Bodas de Manjericão',      significado: 'Aromático e vital — o manjericão celebra o frescor e o sabor que este amor ainda carrega após tantos anos.' },
  { anos:  74, nome: 'Bodas de Macieira',        significado: 'Árvore que floresce e dá frutos — a macieira representa uma vida inteira de colheitas e bênçãos compartilhadas.' },
  { anos:  75, nome: 'Bodas de Brilhante',       significado: 'O brilhante é o diamante lapidado na perfeição — 75 anos juntos são a mais perfeita das joias.' },
  { anos:  76, nome: 'Bodas de Cipreste',        significado: 'Ereto e eterno como o cipreste — representa um amor que permanece firme e imponente diante do tempo.' },
  { anos:  77, nome: 'Bodas de Alfazema',        significado: 'Perfumada e calmante — a alfazema simboliza a serenidade e o aconchego que este amor oferece.' },
  { anos:  78, nome: 'Bodas de Benjoim',         significado: 'Resina sagrada usada em bênçãos — o benjoim representa um amor abençoado e ungido pela fé.' },
  { anos:  79, nome: 'Bodas de Café',            significado: 'Quente, acolhedor e insubstituível — como uma xícara de café, este amor é ritual diário de carinho e presença.' },
  { anos:  80, nome: 'Bodas de Nogueira',        significado: 'Árvore centenária de raízes profundas — a nogueira celebra um amor que plantou sombra para as gerações seguintes.' },
  { anos:  81, nome: 'Bodas de Cacau',           significado: 'Origem do chocolate e do prazer — o cacau representa a doçura que este amor ainda produz após oito décadas.' },
  { anos:  82, nome: 'Bodas de Cravo',           significado: 'Perfumado e intenso — o cravo simboliza a paixão e o calor que resistiram ao teste do tempo.' },
  { anos:  83, nome: 'Bodas de Begônia',         significado: 'Flor de beleza duradoura — a begônia celebra a graça e a alegria que este amor trouxe ao mundo.' },
  { anos:  84, nome: 'Bodas de Damasco',         significado: 'Fruto dourado e saboroso — o damasco representa a riqueza e o amadurecimento de uma longa vida a dois.' },
  { anos:  85, nome: 'Bodas de Girassol',        significado: 'Sempre voltado para a luz — o girassol simboliza um amor que busca o melhor e irradia alegria ao redor.' },
  { anos:  86, nome: 'Bodas de Hortênsia',       significado: 'Bela e abundante — a hortênsia celebra a gratidão e a generosidade que marcam esta união extraordinária.' },
  { anos:  87, nome: 'Bodas de Fúcsia',          significado: 'Vibrante e ousada — a fúcsia representa a vitalidade e a alegria de quem ama sem medo há tanto tempo.' },
  { anos:  88, nome: 'Bodas de Pimenta',         significado: 'Ardente e marcante — a pimenta simboliza que este amor ainda tem sabor, gosto e intensidade únicos.' },
  { anos:  89, nome: 'Bodas de Menta',           significado: 'Refrescante e revigorante — a menta celebra a leveza e o frescor de um amor que se renova a cada dia.' },
  { anos:  90, nome: 'Bodas de Álamo',           significado: 'Árvore altiva e resistente — o álamo representa um amor que cresceu alto, firme e visível para todos.' },
  { anos:  91, nome: 'Bodas de Pinheiro',        significado: 'Sempre verde em todas as estações — o pinheiro simboliza um amor eterno que não conhece inverno.' },
  { anos:  92, nome: 'Bodas de Salgueiro',       significado: 'Flexível e resiliente — o salgueiro representa a capacidade de dobrar sem quebrar, juntos, por toda a vida.' },
  { anos:  93, nome: 'Bodas de Imbuia',          significado: 'Madeira nobre e resistente do Brasil — a imbuia celebra a força e a nobreza de um amor tipicamente brasileiro.' },
  { anos:  94, nome: 'Bodas de Tamareira',       significado: 'Árvore que alimenta e abriga — a tamareira representa um amor que nutriu e protegeu sua família por gerações.' },
  { anos:  95, nome: 'Bodas de Trevo',           significado: 'Símbolo de sorte e fé — o trevo celebra um amor abençoado que encontrou o raro e precioso quatro folhas.' },
  { anos:  96, nome: 'Bodas de Pessegueiro',     significado: 'Delicado e frutífero — o pessegueiro representa a suavidade e os frutos que este amor ainda produz.' },
  { anos:  97, nome: 'Bodas de Alecrim',         significado: 'Erva da memória e da fidelidade — o alecrim simboliza a lembrança de cada momento vivido juntos.' },
  { anos:  98, nome: 'Bodas de Baunilha',        significado: 'Suave, doce e inconfundível — a baunilha representa o sabor único e incomparável deste amor centenário.' },
  { anos:  99, nome: 'Bodas de Acácia',          significado: 'Flor de imortalidade — a acácia celebra um amor que já transcendeu o tempo e se tornou eterno.' },
  { anos: 100, nome: 'Bodas de Jequitibá',       significado: 'A maior árvore do Brasil, secular e imponente — o jequitibá celebra 100 anos de um amor que virou lenda.' },
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
