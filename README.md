# Sistema de Gerenciamento de Membros

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)

Sistema completo de gerenciamento de membros de igreja, desenvolvido com Node.js, Express e PostgreSQL (Supabase).

</div>

---

## Funcionalidades

### Dashboard
- Estatisticas gerais (Total de Membros, Congregados, Total Geral)
- Aniversariantes da semana atual e da semana anterior
- Graficos de pizza com distribuicao por:
  - Sexo (Masculino/Feminino)
  - Tipo (Membro/Congregado/Visitante)
  - Cargo (Membro/Diacono/Cooperador/Presbitero/Evangelista/Pastor)
  - Faixa Etaria (0-17, 18-25, 26-35, 36-45, 46-60, 60+)
  - Departamento (com "Sem Departamento" para membros nao vinculados)
- Estatisticas de idade media

### Gestao de Membros
- Cadastro completo com 38+ campos
- Busca por nome com debounce
- Filtros por tipo, cargo e departamento
- Visualizacao detalhada em modal
- Edicao e exclusao (apenas administradores)
- Exportacao para Excel (.xlsx) com todos os campos
- Cadastro simplificado de visitantes (modal com campos basicos)

### Sistema de Departamentos
- Cadastro de departamentos (Jovens, Adolescentes, Louvor, etc.)
- Vinculo N:N entre membros e departamentos
- Cargo dentro do departamento (Lider, Vice-Lider, Regente, Secretario(a), Tesoureiro(a), Professor(a), Coordenador(a))
- Visualizacao dos membros de cada departamento com seus cargos
- Filtro de membros por departamento na lista principal
- Selecao de departamento e cargo no formulario de cadastro
- Badges de departamento e cargo exibidos na lista de membros
- Grafico de distribuicao por departamento no dashboard

### Vinculo Familiar Automatico
- Ao cadastrar familiar como Conjuge ou Filho(a), o sistema cria automaticamente um perfil de membro
- Conjuge: herda endereco e recebe sexo oposto
- Filhos menores de 10 anos: cadastrados automaticamente como "Congregado"
- Vinculo bidirecional (ex: se Heldem cadastra Vitoria como esposa, Vitoria tera Heldem como Conjuge)
- Link "Ver perfil" clicavel nos familiares vinculados

### Aniversariantes
- Lista de aniversariantes por mes
- Dashboard mostra aniversariantes da semana atual e anterior
- Busca automatica do mes anterior quando necessario (cross-month)
- Badges coloridos por cargo

### Cadastro de Visitantes
- Modal simplificado com campos basicos: nome, data de nascimento, telefone e endereco
- Auto-preenchimento de endereco via CEP (API ViaCEP)
- Tipo automaticamente definido como "Visitante"

### Sistema de Permissoes
- **Usuarios Membros**: Visualizam apenas Nome, Idade e Cargo
- **Administradores**: Acesso completo a todas as informacoes e funcoes de edicao/exclusao

### Tipos de Participante
- **Membro** - Membro efetivo da igreja
- **Congregado** - Frequentador regular (inclui filhos menores de 10 anos)
- **Visitante** - Cadastro simplificado para visitantes

## Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **PostgreSQL** - Banco de dados (via Supabase)
- **bcryptjs** - Criptografia de senhas
- **UUID** - Geracao de tokens de sessao
- **xlsx** - Geracao de planilhas Excel

### Frontend
- **HTML5** - Estrutura
- **CSS3** - Estilizacao (tema dark, responsivo)
- **JavaScript Vanilla** - Logica do cliente
- **Fetch API** - Comunicacao com backend

### Database
- **Supabase** - PostgreSQL hospedado na nuvem

## Estrutura do Projeto

```
membros-igreja/
├── public/                                    # Frontend
│   ├── index-auth.html                       # Dashboard principal
│   ├── login.html                            # Pagina de login
│   ├── app-auth.js                           # Logica JavaScript
│   ├── styles.css                            # Estilos CSS (dark theme)
│   ├── manifest.json                         # PWA manifest
│   └── service-worker.js                     # Service Worker
├── database/
│   ├── schema-supabase.sql                   # Schema completo do banco
│   └── migration-departamentos-familia.sql   # Migration para novas tabelas
├── server-supabase.js                        # Servidor principal
├── package.json                              # Dependencias
├── vercel.json                               # Configuracao Vercel
├── .env                                      # Variaveis de ambiente (NAO COMMITAR)
└── README.md                                 # Este arquivo
```

## Banco de Dados

### Tabelas

| Tabela | Descricao |
|--------|-----------|
| `membros` | Dados completos dos membros (38+ campos) |
| `historicos` | Historico eclesiastico (FK membro_id) |
| `familiares` | Familiares com vinculo a perfil (FK membro_id, membro_vinculado_id) |
| `departamentos` | Departamentos da igreja |
| `membro_departamentos` | Vinculo N:N membros-departamentos com cargo |
| `usuarios` | Usuarios do sistema (admin/usuario) |
| `sessoes` | Tokens de autenticacao |

### Endpoints da API

**Autenticacao:**
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/verify` - Verificar token
- `POST /api/auth/trocar-senha` - Trocar senha

**Membros:**
- `GET /api/membros` - Listar (com filtros: search, tipo, cargo, departamento)
- `GET /api/membros/:id` - Buscar por ID (inclui historicos e familiares)
- `POST /api/membros` - Criar (com auto-criacao de perfis familiares)
- `PUT /api/membros/:id` - Atualizar
- `DELETE /api/membros/:id` - Deletar
- `GET /api/membros/exportar` - Exportar Excel
- `GET /api/membros/:id/departamentos` - Departamentos do membro

**Departamentos:**
- `GET /api/departamentos` - Listar (com contagem de membros)
- `POST /api/departamentos` - Criar
- `PUT /api/departamentos/:id` - Atualizar
- `DELETE /api/departamentos/:id` - Deletar
- `GET /api/departamentos/:id/membros` - Membros do departamento
- `POST /api/departamentos/:id/membros` - Adicionar membro (com cargo)
- `PUT /api/departamentos/:departId/membros/:membroId` - Atualizar cargo
- `DELETE /api/departamentos/:departId/membros/:membroId` - Remover membro

**Dashboard:**
- `GET /api/dashboard` - Estatisticas e graficos
- `GET /api/aniversariantes` - Aniversariantes por mes

**Usuarios (admin):**
- `GET /api/usuarios` - Listar
- `POST /api/usuarios` - Criar
- `PUT /api/usuarios/:id` - Atualizar
- `DELETE /api/usuarios/:id` - Deletar

## Como Rodar Localmente

### Pre-requisitos
- Node.js 16+ instalado
- Conta no Supabase (gratuita)

### 1. Clone o Repositorio
```bash
git clone https://github.com/heldemfilipe/membros-igreja.git
cd membros-igreja
```

### 2. Instale as Dependencias
```bash
npm install
```

### 3. Configure o Banco de Dados

1. Acesse [supabase.com](https://supabase.com) e crie um projeto
2. No **SQL Editor**, execute o conteudo de `database/schema-supabase.sql`
3. Anote a **Database URL** nas configuracoes do projeto

### 4. Configure as Variaveis de Ambiente

Crie um arquivo `.env`:
```env
PORT=3000
DATABASE_URL=postgresql://postgres:[SUA-SENHA]@[SEU-HOST].supabase.co:5432/postgres
```

### 5. Inicie o Servidor
```bash
npm start
```

Acesse: `http://localhost:3000`

**Credenciais padrao:**
- Email: `admin@igreja.com`
- Senha: `admin123`

## Migration (Atualizacao do Banco)

Se o banco ja existia antes das novas funcionalidades, execute no **SQL Editor** do Supabase:

```sql
-- Arquivo: database/migration-departamentos-familia.sql
-- Cria tabelas de departamentos, vinculo membro-departamento com cargo,
-- e coluna de vinculo familiar
```

## Deploy

### Vercel (Recomendado)
1. Conecte o repositorio no [vercel.com](https://vercel.com)
2. Configure a variavel `DATABASE_URL`
3. Deploy automatico

### Railway
1. Conecte no [railway.app](https://railway.app)
2. Configure a variavel `DATABASE_URL`
3. Deploy automatico

## Seguranca

- Senhas criptografadas com bcryptjs
- Tokens de sessao com UUID (expiram em 24h)
- Validacao de permissoes no backend (middleware verificarToken + verificarAdmin)
- Protecao CORS configuravel
- Elementos admin-only ocultos via CSS + verificacao server-side

## Mobile

- Design responsivo (dark theme)
- PWA (Progressive Web App) - instalavel na tela inicial
- Service Worker para suporte offline

## Scripts

```bash
npm start              # Servidor producao (server-supabase.js)
npm run dev-supabase   # Servidor dev com nodemon
npm run backup         # Backup do banco
```

## Cores do Sistema

**Cargos:** Membro (#8f5a1e) | Cooperador (#8d8400) | Diacono (#38a038) | Presbitero (#1881a1) | Evangelista (#162786) | Pastor (#8b3026)

**Sexo:** Masculino (#4a90e2) | Feminino (#e91e63)

**Tipo:** Membro (#852d22) | Congregado (#51990e) | Visitante (#9ea354)

**Departamento:** Roxo (#8e44ad) para badges de cargo no departamento

---

Desenvolvido para a Assembleia de Deus de Rio Claro
