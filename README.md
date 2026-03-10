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

Permite cadastrar e gerenciar membros, congregados e visitantes; acompanhar aniversariantes da semana; organizar departamentos por congregação; controlar permissões granulares por usuário (seção, departamento e congregação) e exportar dados para planilha Excel.

---

## ✨ Funcionalidades

### 🏠 Dashboard
- Cards de totais: membros, congregados e geral (filtrados pela congregação selecionada)
- Gráficos interativos: tipo de participante, sexo, faixa etária, estado civil, cargo eclesiástico e departamento
- Donut chart com total no centro + lista de valores ao lado (legível no modo escuro)
- **Banner de aniversariantes** com filtros semanais coloridos — verde para esta semana, violeta para a anterior
- Pílulas de aniversariantes exibem congregação quando visualizando todas as congregações
- **Visitantes frequentes** — alerta quando um visitante atinge 3+ visitas em 28 dias, com botão para promover a membro
- Feed de **últimas visitas** e **membros recentes**

### 👥 Membros
- CRUD completo com **38+ campos** (dados pessoais, endereço, contato, dados eclesiásticos)
- Busca em tempo real com debounce (300 ms) e filtros por tipo, cargo e departamento
- **Filtro por congregação** na lista (admins sem filtro global podem ver por congregação específica ou "Sem congregação")
- **Cadastro rápido de visitante** via modal com data da visita, botão "Hoje" e campo de congregação
- Modal de visualização com badges coloridos por departamento e cargo
- **Histórico de visitas** para visitantes: registrar e listar diretamente no modal
- Histórico eclesiástico e familiares com linhas dinâmicas no formulário
- Auto-criação de perfil para cônjuge/filhos vinculados
- **Exportação Excel** (`.xlsx`) com todos os campos
- Cards responsivos: departamentos, telefone clicável (`tel:`) e congregação sempre visíveis no mobile

### ⛪ Congregações
- Cadastro e gestão de congregações da denominação
- **Filtro global de congregação** na sidebar — admins e usuários com acesso a múltiplas congregações podem alternar a visualização entre todas ou uma específica
- Filtro reflete em todas as telas: dashboard, membros, aniversariantes e departamentos
- **Campo congregação obrigatório** no cadastro de membro e visitante
- Quando filtro ou restrição de congregação está ativo, o campo é **bloqueado automaticamente** no cadastro — sem exibir outras opções
- Cards de membros e aniversariantes exibem a congregação quando a visualização é de todas as congregações

### 🏢 Departamentos
- CRUD com cards expansíveis por departamento
- **Vínculo com congregação** — cada departamento pertence a uma congregação
- Cores únicas e determinísticas por departamento (via hash do ID)
- Vínculo N:N membros ↔ departamentos com cargo no departamento
- **Editar cargo** de qualquer membro diretamente na listagem (botão de lápis inline)
- Badges coloridos por departamento em toda a aplicação

### 🎂 Aniversariantes
- Listagem por mês com página dedicada
- Filtros semanais com cores distintas: **verde** (esta semana), **violeta** (semana anterior), cinza (ambas)
- Cada nome exibe a cor da semana correspondente, independente do filtro selecionado
- Congregação exibida em cada card quando sem filtro ativo

### 🔐 Usuários & Permissões
- Gestão de usuários (somente admin)
- **Perfis de acesso RBAC** com permissões granulares por seção:
  - Dashboard, Membros, Departamentos, Aniversariantes, Exportar, Visitantes, Histórico, Usuários
  - **Departamentos — Editar**: não-admins podem criar/editar/excluir departamentos
  - **Congregações — Ver / Editar**: controle de acesso à gestão de congregações
- **Restrição por departamento**: limitar usuário a ver apenas membros de departamentos específicos
- **Restrição por congregação**: limitar usuário a ver apenas dados de congregações específicas
- Usuários sem perfil mantêm acesso total (compatibilidade retroativa)

### 🎨 UX
- **Modo escuro** com toggle persistente e sem flash ao carregar
- **Totalmente responsivo** — mobile, tablet e desktop
- Sidebar com itens condicionais baseados nas permissões do usuário logado
- Seletor de congregação na sidebar (visível apenas quando o usuário tem acesso a 2+ congregações)

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
│   │   └── aniversariantes/          # Listagem por mês
│   ├── (dashboard)/                  # Páginas protegidas (layout com Sidebar)
│   │   ├── dashboard/page.tsx
│   │   ├── membros/page.tsx
│   │   ├── departamentos/page.tsx
│   │   ├── congregacoes/page.tsx
│   │   ├── usuarios/page.tsx
│   │   └── aniversariantes/page.tsx
│   ├── login/page.tsx
│   ├── layout.tsx                    # Root layout (anti-flash, Providers)
│   ├── globals.css                   # Tailwind + CSS Variables (light/dark)
│   └── page.tsx                      # Redirect → /dashboard
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx               # Navegação lateral + seletor de congregação
│   │   └── DashboardLayout.tsx       # Wrapper com proteção de rota
│   ├── membros/
│   │   ├── MemberForm.tsx            # Formulário completo (38+ campos)
│   │   ├── MemberModal.tsx           # Modal wrapper do formulário
│   │   ├── VisitorModal.tsx          # Cadastro rápido de visitante
│   │   └── MemberViewModal.tsx       # Visualização + histórico de visitas
│   ├── dashboard/
│   │   └── StatCard.tsx              # Card de estatística reutilizável
│   └── ui/                           # Componentes Shadcn/Radix
├── contexts/
│   └── AuthContext.tsx               # Auth custom + filtroCongregacao + temPermissao()
├── lib/
│   ├── db.ts                         # Pool pg (DATABASE_URL)
│   ├── auth.ts                       # verificarToken + permissões
│   ├── constants.ts                  # Cores, cargos, permissões disponíveis
│   └── utils.ts                      # cn, calcularIdade, formatarData, toNull
└── types/
    └── index.ts                      # Tipos TypeScript (Membro, Visita, Perfil…)
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

---

## 🗄️ Banco de Dados

As tabelas principais precisam ser criadas manualmente no PostgreSQL. As tabelas `visitas` e `perfis_acesso` são **criadas automaticamente** na primeira chamada à API (`CREATE TABLE IF NOT EXISTS`). A coluna `congregacao_id` em `departamentos` é adicionada automaticamente via migração lazy.

| Tabela | Criação | Descrição |
|--------|:-------:|-----------|
| `membros` | Manual | Dados completos dos membros (38+ campos, campo `igreja` = nome da congregação) |
| `historicos` | Manual | Histórico eclesiástico (`FK membro_id`) |
| `familiares` | Manual | Familiares (`FK membro_id`, `membro_vinculado_id`) |
| `departamentos` | Manual | Departamentos da igreja (coluna `congregacao_id` adicionada automaticamente) |
| `membro_departamentos` | Manual | Vínculo N:N membros ↔ departamentos |
| `congregacoes` | Manual | Congregações da denominação (id, nome) |
| `usuarios` | Manual | Usuários do sistema (senhas bcrypt, `congregacoes_acesso` int[]) |
| `sessoes` | Manual | Tokens de autenticação (UUID, `expira_em`) |
| `visitas` | ✅ Auto | Histórico de visitas dos visitantes |
| `perfis_acesso` | ✅ Auto | Perfis de permissão RBAC (JSONB) |

---

## 🔑 Autenticação

- Autenticação **100% customizada** — sem Supabase Auth
- Login via `POST /api/auth/login` → retorna token UUID
- Token salvo no `localStorage`, enviado como `Authorization: Bearer <token>`
- Sessões expiram em **7 dias** (tabela `sessoes`)
- Usuários com `is_admin = true` têm acesso irrestrito

### Permissões (RBAC)

```
Admin → acesso total a todas as congregações (ignora perfil)
Usuário com perfil → acesso apenas às seções e congregações permitidas
Usuário sem perfil → acesso total (compatibilidade retroativa)
```

Os perfis armazenam permissões em uma coluna `JSONB` e são gerenciados pela tela de **Usuários** (somente admin).

**Permissões disponíveis:**

| Chave | Descrição |
|-------|-----------|
| `dashboard` | Ver dashboard |
| `membros_ver` | Ver lista de membros |
| `membros_editar` | Criar e editar membros |
| `departamentos_ver` | Ver departamentos |
| `departamentos_editar` | Criar e editar departamentos |
| `aniversariantes` | Ver aniversariantes |
| `exportar` | Exportar Excel |
| `visitantes` | Cadastrar visitantes |
| `historico` | Ver histórico de visitas |
| `usuarios` | Gerenciar usuários (admin) |
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
- **`maxDuration: 30s`** nas API routes (evita timeout em queries pesadas)
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
