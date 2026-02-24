<div align="center">

# ⛪ Sistema de Membros — Igreja

**Plataforma web completa para gestão de membros, departamentos e visitantes de uma congregação.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38BDF8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791?style=flat-square&logo=postgresql&logoColor=white)](https://supabase.com/)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com/)

</div>

---

## 📋 Sobre o Projeto

Sistema interno desenvolvido para a **Assembleia de Deus de Rio Claro**, com foco em simplicidade e praticidade para secretaria e liderança.

Permite cadastrar e gerenciar membros, congregados e visitantes; acompanhar visitas, aniversariantes da semana; organizar departamentos; controlar permissões de usuários e exportar dados para planilha Excel.

---

## ✨ Funcionalidades

### 🏠 Dashboard
- Cards de totais: membros, congregados e geral
- Gráficos interativos: tipo de participante, sexo, faixa etária, estado civil, cargo eclesiástico e departamento
- Donut chart com total no centro + lista de valores ao lado (legível no modo escuro)
- **Banner de aniversariantes** com filtros semanais coloridos — verde para esta semana, violeta para a anterior
- **Visitantes frequentes** — alerta quando um visitante atinge 3+ visitas em 28 dias, com botão para promover a membro
- Feed de **últimas visitas** e **membros recentes**

### 👥 Membros
- CRUD completo com **38+ campos** (dados pessoais, endereço, contato, dados eclesiásticos)
- Busca em tempo real com debounce (300 ms) e filtros por tipo, cargo e departamento
- **Cadastro rápido de visitante** via modal com data da visita e botão "Hoje"
- Modal de visualização com badges coloridos por departamento e cargo
- **Histórico de visitas** para visitantes: registrar e listar diretamente no modal
- Histórico eclesiástico e familiares com linhas dinâmicas no formulário
- Auto-criação de perfil para cônjuge/filhos vinculados
- **Exportação Excel** (`.xlsx`) com todos os campos

### 🏢 Departamentos
- CRUD com cards expansíveis por departamento
- Cores únicas e determinísticas por departamento (via hash do ID)
- Vínculo N:N membros ↔ departamentos com cargo no departamento
- **Editar cargo** de qualquer membro diretamente na listagem (botão de lápis inline)
- Badges coloridos por departamento em toda a aplicação

### 🎂 Aniversariantes
- Listagem por mês com página dedicada
- Filtros semanais com cores distintas: **verde** (esta semana), **violeta** (semana anterior), cinza (ambas)
- Cada nome exibe a cor da semana correspondente, independente do filtro selecionado

### 🔐 Usuários & Permissões
- Gestão de usuários (somente admin)
- **Perfis de acesso RBAC**: criação de perfis com permissões granulares por seção
- Permissões: Dashboard, Membros, Departamentos, Aniversariantes, Exportar, Visitantes, Histórico, Usuários
- Restrição por departamento: perfis podem limitar acesso a departamentos específicos
- Usuários sem perfil mantêm acesso total (compatibilidade retroativa)

### 🎨 UX
- **Modo escuro** com toggle persistente e sem flash ao carregar
- **Totalmente responsivo** — mobile, tablet e desktop
- Sidebar com itens condicionais baseados nas permissões do usuário logado

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
│   │   ├── visitas/                  # Registro de visitas (tabela auto-criada)
│   │   ├── perfis/                   # Perfis RBAC (tabela auto-criada)
│   │   ├── usuarios/                 # CRUD de usuários (admin)
│   │   ├── dashboard/                # Estatísticas agregadas
│   │   └── aniversariantes/          # Listagem por mês
│   ├── (dashboard)/                  # Páginas protegidas (layout com Sidebar)
│   │   ├── dashboard/page.tsx
│   │   ├── membros/page.tsx
│   │   ├── departamentos/page.tsx
│   │   ├── usuarios/page.tsx
│   │   └── aniversariantes/page.tsx
│   ├── login/page.tsx
│   ├── layout.tsx                    # Root layout (anti-flash, Providers)
│   ├── globals.css                   # Tailwind + CSS Variables (light/dark)
│   └── page.tsx                      # Redirect → /dashboard
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx               # Navegação lateral + permissões
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
│   └── AuthContext.tsx               # Auth custom + temPermissao()
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

As tabelas principais precisam ser criadas manualmente no PostgreSQL. As tabelas `visitas` e `perfis_acesso` são **criadas automaticamente** na primeira chamada à API (`CREATE TABLE IF NOT EXISTS`).

| Tabela | Criação | Descrição |
|--------|:-------:|-----------|
| `membros` | Manual | Dados completos dos membros (38+ campos) |
| `historicos` | Manual | Histórico eclesiástico (`FK membro_id`) |
| `familiares` | Manual | Familiares (`FK membro_id`, `membro_vinculado_id`) |
| `departamentos` | Manual | Departamentos da igreja |
| `membro_departamentos` | Manual | Vínculo N:N membros ↔ departamentos |
| `usuarios` | Manual | Usuários do sistema (senhas bcrypt) |
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
Admin → acesso total (ignora perfil)
Usuário com perfil → acesso apenas às seções permitidas no perfil
Usuário sem perfil → acesso total (compatibilidade retroativa)
```

Os perfis armazenam permissões em uma coluna `JSONB` e são gerenciados pela tela de **Usuários** (somente admin).

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
