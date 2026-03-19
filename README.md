<div align="center">

# ⛪ Sistema de Membros — Igreja

**Plataforma web completa para gestão de membros, departamentos, congregações e visitantes.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=flat-square&logo=postgresql&logoColor=white)](https://supabase.com/)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com/)

</div>

---

## 📋 Sobre o Projeto

Sistema interno desenvolvido para a **Assembleia de Deus de Rio Claro**, com suporte a **múltiplas congregações**, foco em simplicidade e praticidade para secretaria e liderança.

Permite cadastrar e gerenciar membros, congregados e visitantes; acompanhar aniversariantes de nascimento e casamento; organizar departamentos por congregação; controlar permissões granulares por usuário e exportar dados para planilha Excel.

---

## ✨ Funcionalidades

### 🏠 Dashboard
- Cards de totais: membros, congregados e geral (filtrados pela congregação selecionada)
- Gráficos interativos: tipo de participante, sexo, faixa etária, estado civil, cargo eclesiástico e departamento
- **Widget de aniversários de nascimento** — filtro por esta semana / semana anterior / ambas; cores distintas por semana
- **Widget de aniversários de casamento** — mesmo filtro semanal; exibe o casal como "João + Maria" quando ambos cadastrados; clique na boda abre dialog com nome e significado
- **Banner de visitantes frequentes** — alerta quando um visitante atinge 3+ visitas em 28 dias, com botão para promover a membro
- Feed de **últimas visitas** e **membros recentes**

### 👥 Membros
- CRUD completo com **38+ campos** (dados pessoais, endereço, contato, documentos, dados eclesiásticos)
- **Validação em tempo real** com destaque vermelho: CPF (dígitos verificadores mod 11), RG, CEP, telefone, e-mail e datas futuras — não bloqueante, apenas indicativo
- Busca em tempo real com debounce (300 ms) e filtros por tipo, cargo e departamento
- **Filtro por congregação** na lista; opção "Sem congregação" para admins
- **Departamentos filtrados pela congregação** — ao selecionar a congregação no cadastro, só aparecem os departamentos daquela congregação; sem congregação selecionada, seção de departamentos fica oculta
- Auto-preenchimento: ao trocar de congregação, departamentos incompatíveis são desmarcados automaticamente
- **Cadastro rápido de visitante** via modal com data da visita, botão "Hoje" e campo de congregação
- Histórico eclesiástico e familiares com linhas dinâmicas
- **Vinculação de familiar a membro já cadastrado** — busca inline com dropdown e opção de cadastro rápido
- Auto-criação de perfil para cônjuge/filhos vinculados + propagação automática da `data_casamento` para o cônjuge
- **Exportação Excel** (`.xlsx`) com todos os campos
- Cards responsivos: departamentos, telefone clicável (`tel:`) e congregação visíveis no mobile

### ⛪ Congregações
- Cadastro e gestão de congregações da denominação
- **Filtro global de congregação** na sidebar — admins e usuários multi-congregação alternam entre todas ou uma específica
- Filtro reflete em todas as telas: dashboard, membros, aniversariantes e departamentos
- Campo congregação obrigatório no cadastro; bloqueado automaticamente quando filtro ativo

### 🏢 Departamentos
- CRUD com cards expansíveis por departamento
- **Vínculo com congregação** — cada departamento pertence a uma congregação
- Cores únicas e determinísticas por departamento (via hash do ID)
- Vínculo N:N membros ↔ departamentos com cargo no departamento
- Editar cargo de qualquer membro diretamente na listagem (botão de lápis inline)
- Badges coloridos por departamento em toda a aplicação

### 🎂 Aniversariantes
- **Aba Nascimento** — listagem mensal com filtro de semana; cor do card reflete a semana do aniversário
- **Aba Casamento** — listagem de aniversários de casamento; deduplica casais (exibe "Fulano + Cônjuge" uma única vez); inclui automaticamente o cônjuge vinculado mesmo que só um dos dois tenha `data_casamento`
- **Bodas de casamento** — badge clicável exibe o nome da boda (ex: "Bodas de Prata") + dialog com significado; cobre de 1 a 70 anos de casamento
- Grid responsivo 2 colunas no mobile, 3 no desktop
- Congregação exibida em cada card quando sem filtro ativo

### 🔐 Usuários & Permissões
- Gestão de usuários (somente admin)
- **Perfis de acesso RBAC** com permissões granulares por seção
- **Restrição por departamento**: limitar usuário a membros de departamentos específicos
- **Restrição por congregação**: limitar usuário a dados de congregações específicas
- Formulário de usuário: congregações selecionadas filtram os departamentos disponíveis; ao desmarcar uma congregação, departamentos incompatíveis são removidos automaticamente
- `congregacoes_acesso` e `departamentos_acesso` salvos corretamente tanto na criação quanto na edição

### 🎨 UX & Performance
- **Modo escuro** com toggle persistente e sem flash ao carregar
- **Totalmente responsivo** — mobile, tablet e desktop
- Fetches paralelos com `Promise.allSettled` + `AbortController` em todos os formulários e listas (sem loading em cascata)
- Timeout de segurança de 30 s no salvamento — evita spinner infinito em caso de falha de rede
- Verificação de token no boot com timeout de 10 s + AbortController — sem tela branca em conexões lentas

---

## 🛠️ Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Linguagem | [TypeScript 5.3](https://www.typescriptlang.org/) |
| Estilo | [Tailwind CSS 3.4](https://tailwindcss.com/) + CSS Variables |
| Componentes UI | [Shadcn/Radix UI](https://ui.shadcn.com/) |
| Banco de dados | [Supabase](https://supabase.com/) PostgreSQL via [`pg`](https://node-postgres.com/) |
| Autenticação | Custom (tabelas `usuarios` + `sessoes`) |
| Gráficos | [Recharts](https://recharts.org/) |
| Exportação | [xlsx](https://sheetjs.com/) |
| Ícones | [Lucide React](https://lucide.dev/) |
| Deploy | [Vercel](https://vercel.com/) |

---

## 📁 Estrutura do Projeto

```
src/
├── app/
│   ├── api/                          # API Routes
│   │   ├── auth/                     # login, logout, verify, trocar-senha
│   │   ├── membros/                  # CRUD + exportar
│   │   ├── departamentos/            # CRUD + membros (GET/POST/PUT/DELETE)
│   │   ├── congregacoes/             # CRUD de congregações
│   │   ├── visitas/                  # Registro de visitas (tabela auto-criada)
│   │   ├── perfis/                   # Perfis RBAC (tabela auto-criada)
│   │   ├── usuarios/                 # CRUD de usuários (admin)
│   │   ├── dashboard/                # Estatísticas agregadas
│   │   └── aniversariantes/
│   │       ├── route.ts              # Aniversários de nascimento
│   │       └── casamento/route.ts    # Aniversários de casamento (com deduplicação de casais)
│   ├── (dashboard)/                  # Páginas protegidas (layout com Sidebar)
│   │   ├── dashboard/page.tsx
│   │   ├── membros/page.tsx
│   │   ├── departamentos/page.tsx
│   │   ├── congregacoes/page.tsx
│   │   ├── usuarios/page.tsx
│   │   └── aniversariantes/page.tsx  # Abas: Nascimento + Casamento
│   ├── login/page.tsx
│   ├── layout.tsx                    # Root layout (anti-flash, Providers)
│   ├── globals.css                   # Tailwind + CSS Variables (light/dark)
│   └── page.tsx                      # Redirect → /dashboard
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx               # Navegação lateral + seletor de congregação
│   │   └── DashboardLayout.tsx       # Wrapper com proteção de rota
│   ├── membros/
│   │   ├── MemberForm.tsx            # Formulário completo (38+ campos, validação, depts filtrados)
│   │   ├── MemberModal.tsx           # Modal wrapper do formulário
│   │   ├── VisitorModal.tsx          # Cadastro rápido de visitante
│   │   └── MemberViewModal.tsx       # Visualização + histórico de visitas
│   ├── dashboard/
│   │   └── StatCard.tsx              # Card de estatística reutilizável
│   └── ui/                           # Componentes Shadcn/Radix
├── contexts/
│   └── AuthContext.tsx               # Auth custom + filtroCongregacao + temPermissao()
├── lib/
│   ├── db.ts                         # Pool pg (DATABASE_URL, max:1, timeouts)
│   ├── auth.ts                       # verificarToken + helpers unauthorized/forbidden/notFound
│   ├── access.ts                     # buildAccessWhere() — lógica centralizada de controle de acesso
│   ├── constants.ts                  # Cargos, cores, bodas, estilos compartilhados
│   ├── familyInference.ts            # Inferência automática de relações familiares derivadas
│   └── utils.ts                      # cn, calcularIdade, formatarData, toNull
└── types/
    └── index.ts                      # Tipos TypeScript (Membro, Visita, Perfil, AniversarianteCasamento…)
```

---

## ⚙️ Configuração Local

### Pré-requisitos

- Node.js 18+
- Banco PostgreSQL (recomendado: [Supabase](https://supabase.com/) — free tier)

### Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/heldemfilipe/membros-igreja.git
cd membros-igreja

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local e preencha DATABASE_URL

# 4. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Variáveis de Ambiente

Crie o arquivo `.env.local` na raiz do projeto:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

> O projeto usa `pg` (node-postgres) diretamente — **não é necessário** Supabase JS client nem `ANON_KEY`.
> Para Supabase, use o pooler em modo **Transaction** (porta `6543`) com `?pgbouncer=true` para compatibilidade serverless.

---

## 🗄️ Banco de Dados

As tabelas principais precisam ser criadas manualmente no PostgreSQL. As tabelas `visitas` e `perfis_acesso` são **criadas automaticamente** na primeira chamada à API. Colunas como `congregacao_id` em `departamentos` e `funcao_igreja` em `membros` são adicionadas via **migração lazy** (fora de transação, idempotente).

| Tabela | Criação | Descrição |
|--------|:-------:|-----------|
| `membros` | Manual | Dados completos dos membros (38+ campos) |
| `historicos` | Manual | Histórico eclesiástico (`FK membro_id`) |
| `familiares` | Manual | Familiares (`FK membro_id`, `membro_vinculado_id`) |
| `departamentos` | Manual | Departamentos da igreja (`congregacao_id` auto-adicionado) |
| `membro_departamentos` | Manual | Vínculo N:N membros ↔ departamentos |
| `congregacoes` | Manual | Congregações da denominação (id, nome) |
| `usuarios` | Manual | Usuários do sistema (bcrypt, `congregacoes_acesso int[]`) |
| `sessoes` | Manual | Tokens de autenticação (UUID, `expira_em`) |
| `visitas` | ✅ Auto | Histórico de visitas dos visitantes |
| `perfis_acesso` | ✅ Auto | Perfis de permissão RBAC (JSONB) |

---

## 🔑 Autenticação

- Autenticação **100% customizada** — sem Supabase Auth
- Login via `POST /api/auth/login` → retorna token UUID
- Token salvo no `localStorage`, enviado como `Authorization: Bearer <token>`
- Sessões expiram em **7 dias** (tabela `sessoes`)
- Verificação de token no boot com timeout de 10 s + AbortController

### Permissões (RBAC)

```
Admin        → acesso total a todas as congregações (ignora perfil)
Usuário com perfil → acesso apenas às seções/congregações/departamentos permitidos
Usuário sem perfil → acesso total (compatibilidade retroativa)
```

A lógica de controle de acesso nas API routes é centralizada em `src/lib/access.ts` → `buildAccessWhere()`, aplicada consistentemente em membros, dashboard e aniversariantes.

**Permissões disponíveis:**

| Chave | Descrição |
|-------|-----------|
| `dashboard` | Ver dashboard |
| `membros_ver` | Ver lista de membros |
| `membros_editar` | Criar e editar membros |
| `membros_excluir` | Excluir membros |
| `membros_exportar` | Exportar Excel |
| `departamentos_ver` | Ver departamentos |
| `departamentos_editar` | Criar e editar departamentos |
| `aniversariantes_ver` | Ver aniversariantes |
| `congregacoes_ver` | Ver congregações |
| `congregacoes_editar` | Criar e editar congregações |

**Restrições adicionais por usuário:**
- `departamentos_acesso: int[]` — limita a membros de departamentos específicos
- `congregacoes_acesso: int[]` — limita a dados de congregações específicas

---

## 🚀 Deploy no Vercel

1. Importe o repositório em [vercel.com/new](https://vercel.com/new)
2. Adicione a variável de ambiente `DATABASE_URL` no painel do projeto
3. Clique em **Deploy** — pronto!

O `vercel.json` já está configurado com:
- Região **`gru1`** (São Paulo) — menor latência para usuários brasileiros
- **`maxDuration: 30s`** nas API routes
- Headers de segurança (CSP, X-Frame-Options, Referrer-Policy)

---

## 📜 Scripts

```bash
npm run dev      # Servidor de desenvolvimento (http://localhost:3000)
npm run build    # Build de produção
npm run start    # Servidor de produção (após build)
npm run lint     # Verificação de lint (ESLint)
```

---

<div align="center">

Desenvolvido com ❤️ para a **Assembleia de Deus de Rio Claro**

</div>
