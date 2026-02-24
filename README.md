# Sistema de Membros — Igreja

Sistema web para gestão de membros, departamentos, visitantes e aniversariantes de uma congregação, construído com **Next.js 14**, **TypeScript** e **Tailwind CSS**.

---

## Tecnologias

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Linguagem | TypeScript |
| Estilo | Tailwind CSS 3.4 + CSS Variables |
| UI | Shadcn/Radix UI (Button, Dialog, Badge, Select, Toast…) |
| Banco de Dados | Supabase PostgreSQL (via `pg` direto) |
| Autenticação | Custom (tabelas `usuarios` + `sessoes`) |
| Gráficos | Recharts (PieChart, BarChart com donut + listas) |
| Exportação | xlsx (planilha Excel) |
| Ícones | Lucide React |
| Deploy | Vercel |

---

## Funcionalidades

### Dashboard
- Totais gerais (membros, congregados, total)
- Gráficos interativos: por tipo, sexo, faixa etária, estado civil, cargo eclesiástico e departamento
- **Donut chart** com total no centro + lista de valores ao lado
- **Banner de aniversariantes** da semana com filtros coloridos (esta semana = verde, semana anterior = violeta)
- **Visitantes frequentes** — card de alerta quando um visitante atinge 3+ visitas em 28 dias, com botão para promover a membro
- **Últimas visitas** — feed das visitas mais recentes com nome, telefone e data formatada
- **Membros recentes** — últimos cadastros com tipo de participante

### Membros
- CRUD completo com 38+ campos, busca com debounce (300 ms), filtros por tipo/cargo/departamento
- **Cadastro rápido de visitante** — modal com data da visita e botão "Hoje"
- **Visualização detalhada** — modal com todos os dados, badges coloridos por departamento e cargo
- **Histórico de visitas** no modal de visualização (para visitantes): registrar, listar e navegar
- Histórico eclesiástico e familiares (linhas dinâmicas no formulário)
- Auto-criação de perfil para cônjuge/filhos vinculados
- Exportação Excel (`.xlsx`) com todos os campos

### Departamentos
- CRUD com cards expansíveis
- Cores únicas por departamento (determinístico por ID)
- Vínculo N:N membros ↔ departamentos com cargo no departamento
- **Editar cargo** de um membro no departamento via botão inline (Pencil)
- Badges coloridos de cargo na listagem de membros

### Aniversariantes
- Listagem por mês com filtros semanais
- **Coloração por semana**: nomes da semana atual em verde, semana anterior em violeta (independente do filtro ativo)
- Filtros com cores distintas: Esta semana (verde), Semana anterior (violeta), Ambas as semanas (cinza)
- Botão "Ver todos os aniversariantes" destacado no dashboard

### Usuários & Permissões
- Gestão de usuários (admin only)
- **Perfis de acesso** (RBAC): criação de perfis com permissões granulares por seção
- Permissões disponíveis: Dashboard, Membros, Departamentos, Aniversariantes, Exportar, Visitantes, Histórico, Usuários
- **Restrição por departamento**: perfis podem limitar acesso a departamentos específicos
- Usuários sem perfil mantêm acesso total (compatibilidade retroativa)

### UX Geral
- **Modo escuro** — toggle persistente (sem flash de tema)
- **Totalmente responsivo** — mobile, tablet e desktop
- Sidebar com itens condicionais baseados em permissões do usuário

---

## Estrutura do Projeto

```
src/
├── app/
│   ├── api/                        # API Routes (Next.js)
│   │   ├── auth/                   # login, logout, verify, trocar-senha
│   │   ├── membros/                # CRUD + exportar
│   │   ├── departamentos/          # CRUD + membros do depto (GET/POST/PUT/DELETE)
│   │   ├── visitas/                # Registro de visitas (GET/POST, criação automática de tabela)
│   │   ├── perfis/                 # Perfis de acesso RBAC (GET/POST/PUT/DELETE)
│   │   ├── usuarios/               # CRUD (admin)
│   │   ├── dashboard/              # Estatísticas agregadas
│   │   └── aniversariantes/        # Listagem por mês
│   ├── (dashboard)/                # Páginas protegidas (layout com Sidebar)
│   │   ├── dashboard/page.tsx
│   │   ├── membros/page.tsx
│   │   ├── departamentos/page.tsx
│   │   ├── usuarios/page.tsx
│   │   └── aniversariantes/page.tsx
│   ├── login/page.tsx
│   ├── layout.tsx                  # Root layout (anti-flash script, Providers)
│   ├── globals.css                 # Tailwind + CSS Variables (light/dark)
│   └── page.tsx                    # Redirect → /dashboard
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx             # Navegação lateral responsiva + permissões
│   │   └── DashboardLayout.tsx     # Wrapper com proteção de rota
│   ├── membros/
│   │   ├── MemberForm.tsx          # Formulário completo (38+ campos)
│   │   ├── MemberModal.tsx         # Modal wrapper do formulário
│   │   ├── VisitorModal.tsx        # Cadastro rápido de visitante + data da visita
│   │   └── MemberViewModal.tsx     # Modal de visualização + histórico de visitas
│   ├── dashboard/
│   │   └── StatCard.tsx            # Card de estatística reutilizável
│   └── ui/                         # Componentes Shadcn/Radix
├── contexts/
│   └── AuthContext.tsx             # Custom auth + permissões (temPermissao)
├── lib/
│   ├── db.ts                       # Pool pg (DATABASE_URL)
│   ├── auth.ts                     # verificarToken helper (com permissões)
│   ├── constants.ts                # Cores de cargo/departamento, listas de opções, permissões
│   └── utils.ts                    # cn, calcularIdade, formatarData, toNull, getDiaDoMes
└── types/
    └── index.ts                    # TypeScript types (Membro, Departamento, Visita…)
```

---

## Variáveis de Ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
```

> O projeto usa `pg` (node-postgres) diretamente. Não é necessário o Supabase JS client nem a ANON_KEY.

---

## Executar Localmente

```bash
# 1. Instalar dependências
npm install

# 2. Criar .env.local com DATABASE_URL

# 3. Iniciar em modo desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Build de Produção

```bash
npm run build
npm run start
```

---

## Deploy no Vercel

1. Importe o repositório no [Vercel](https://vercel.com)
2. Configure a variável de ambiente `DATABASE_URL` no painel do projeto
3. Deploy automático a cada `git push`

O arquivo `vercel.json` já está configurado com `"framework": "nextjs"`.

---

## Banco de Dados

As tabelas principais devem existir no PostgreSQL. As tabelas `visitas` e `perfis_acesso` são criadas automaticamente na primeira chamada à API correspondente (`CREATE TABLE IF NOT EXISTS`).

| Tabela | Criação | Descrição |
|--------|---------|-----------|
| `membros` | Manual | Dados completos dos membros (38+ campos) |
| `historicos` | Manual | Histórico eclesiástico (FK `membro_id`) |
| `familiares` | Manual | Familiares (FK `membro_id`, `membro_vinculado_id`) |
| `departamentos` | Manual | Departamentos da igreja |
| `membro_departamentos` | Manual | Vínculo N:N membros ↔ departamentos (com `cargo_departamento`) |
| `usuarios` | Manual | Usuários do sistema (senhas bcrypt) |
| `sessoes` | Manual | Tokens de autenticação (UUID, `expira_em`) |
| `visitas` | **Automática** | Histórico de visitas dos visitantes |
| `perfis_acesso` | **Automática** | Perfis de permissão RBAC (JSONB) |

---

## Autenticação

- Autenticação **customizada** — sem Supabase Auth
- Login via `/api/auth/login` (POST) → retorna `token` UUID
- Token armazenado no `localStorage`, enviado como `Authorization: Bearer <token>`
- Sessões salvas na tabela `sessoes` com expiração de 7 dias
- Verificação via `/api/auth/verify` (GET)
- Usuários com `is_admin = true` têm acesso total e gerenciam usuários/perfis

### Sistema de Permissões (RBAC)

- **Perfis de acesso** definem quais seções um usuário pode acessar
- Perfis armazenam permissões em coluna JSONB na tabela `perfis_acesso`
- Usuários sem `perfil_id` mantêm acesso irrestrito (compatibilidade com contas existentes)
- Função `temPermissao(chave)` no `AuthContext` verifica permissão em tempo real
- Admins sempre têm acesso total, independente de perfil

---

## Modo Escuro

- Estratégia: classe `dark` no `<html>` (`darkMode: ['class']` no Tailwind)
- Script anti-flash embutido inline no `<head>` (sem piscar ao carregar)
- Preferência salva em `localStorage` (`theme: 'dark' | 'light'`)
- Toggle no rodapé da Sidebar (ícone Sol/Lua)

---

Desenvolvido para a Assembleia de Deus de Rio Claro
