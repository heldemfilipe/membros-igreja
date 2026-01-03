# 🏛️ Sistema de Gerenciamento de Membros - Assembleia de Deus de Rio Claro

Sistema completo de gerenciamento de membros da igreja, desenvolvido com Node.js, Express e PostgreSQL (Supabase).

## 📋 Funcionalidades

### Dashboard
- 📊 Estatísticas gerais (Total de Membros, Congregados, Total Geral)
- 🎂 Aniversariantes da semana atual
- 📈 Gráficos de pizza com distribuição por:
  - Sexo (Masculino/Feminino)
  - Tipo (Membro/Congregado/Visitante)
  - Cargo (Membro/Diácono/Cooperador/Presbítero/Evangelista/Pastor)
- 📊 Estatísticas de idade média

### Gestão de Membros
- ✅ Cadastro completo de membros
- 🔍 Busca por nome
- 🎯 Filtros por tipo e cargo
- 👁️ Visualização detalhada de informações
- ✏️ Edição de dados (apenas administradores)
- 🗑️ Exclusão de membros (apenas administradores)
- 📊 **Exportação para Excel** - Baixe planilha completa com todos os membros

### Aniversariantes
- 🎉 Lista de aniversariantes por mês
- 📅 Filtro por mês específico
- 🎨 Badges coloridos por cargo

### Sistema de Permissões
- 👤 **Usuários Membros**: Visualizam apenas Nome, Idade e Cargo
- 👑 **Administradores**: Acesso completo a todas as informações e funções de edição/exclusão

### Dados de Membros
- Informações Pessoais (Nome, Conhecido Como, Sexo, Data de Nascimento)
- Contatos (Telefone Principal, Telefone Secundário, Email)
- Endereço Completo
- Dados Eclesiais (Tipo, Cargo, Data de Batismo, Igreja de Origem)
- Familiares
- Histórico Eclesiástico
- Observações

## 🛠️ Tecnologias Utilizadas

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **PostgreSQL** - Banco de dados (via Supabase)
- **bcryptjs** - Criptografia de senhas
- **UUID** - Geração de tokens de sessão
- **CORS** - Configuração de CORS
- **xlsx** - Geração de planilhas Excel

### Frontend
- **HTML5** - Estrutura
- **CSS3** - Estilização (tema dark, responsivo)
- **JavaScript Vanilla** - Lógica do cliente
- **Fetch API** - Comunicação com backend

### Database
- **Supabase** - PostgreSQL hospedado na nuvem

## 📦 Estrutura do Projeto

```
membros-igreja/
├── public/                      # Frontend (arquivos estáticos)
│   ├── index-auth.html         # Dashboard principal
│   ├── login.html              # Página de login
│   ├── app-auth.js             # Lógica JavaScript
│   ├── styles.css              # Estilos CSS
│   ├── manifest.json           # PWA manifest
│   └── service-worker.js       # Service Worker (PWA)
├── server-supabase.js          # Servidor principal (Supabase)
├── package.json                # Dependências do projeto
├── .env                        # Variáveis de ambiente (NÃO COMMITAR)
└── README.md                   # Este arquivo
```

## 🚀 Como Rodar Localmente

### Pré-requisitos
- Node.js 16+ instalado
- Conta no Supabase (gratuita)
- Git instalado

### 1. Clone o Repositório
```bash
git clone https://github.com/seu-usuario/membros-igreja.git
cd membros-igreja
```

### 2. Instale as Dependências
```bash
npm install
```

### 3. Configure o Banco de Dados Supabase

#### 3.1. Criar Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com)
2. Crie uma conta gratuita
3. Crie um novo projeto
4. Anote a **Database URL** nas configurações do projeto

#### 3.2. Criar as Tabelas

Execute os seguintes comandos SQL no **SQL Editor** do Supabase:

```sql
-- Tabela de Membros
CREATE TABLE membros (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    conhecido_como VARCHAR(255),
    sexo VARCHAR(20),
    data_nascimento DATE,
    telefone_principal VARCHAR(20),
    telefone_secundario VARCHAR(20),
    email VARCHAR(255),
    endereco_rua VARCHAR(255),
    endereco_numero VARCHAR(20),
    endereco_complemento VARCHAR(100),
    endereco_bairro VARCHAR(100),
    endereco_cidade VARCHAR(100),
    endereco_estado VARCHAR(2),
    endereco_cep VARCHAR(10),
    tipo_participante VARCHAR(50),
    cargo VARCHAR(100),
    data_batismo DATE,
    igreja_origem VARCHAR(255),
    familiares JSONB,
    historico_eclesiastico JSONB,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Usuários
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) DEFAULT 'membro',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Sessões
CREATE TABLE sessoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX idx_membros_nome ON membros(nome);
CREATE INDEX idx_membros_data_nascimento ON membros(data_nascimento);
CREATE INDEX idx_membros_tipo ON membros(tipo_participante);
CREATE INDEX idx_membros_cargo ON membros(cargo);
CREATE INDEX idx_sessoes_token ON sessoes(token);
CREATE INDEX idx_sessoes_expires ON sessoes(expires_at);
```

#### 3.3. Criar Usuário Administrador

```sql
-- Inserir usuário admin (senha: admin123)
INSERT INTO usuarios (email, senha, nome, tipo)
VALUES (
    'admin@igreja.com',
    '$2a$10$xQZ9J9X9Z9X9Z9X9Z9X9ZuXxXxXxXxXxXxXxXxXxXxXxXxXxXxXxX',
    'Administrador',
    'admin'
);
```

**IMPORTANTE**: Você precisa gerar o hash da senha usando bcryptjs. Execute este script Node.js:

```javascript
const bcrypt = require('bcryptjs');
const senha = 'admin123';
const hash = bcrypt.hashSync(senha, 10);
console.log('Hash da senha:', hash);
```

Depois substitua o hash no SQL acima.

### 4. Configure as Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Porta do servidor
PORT=3000

# URL de conexão do PostgreSQL (Supabase)
DATABASE_URL=postgresql://postgres:[SUA-SENHA]@[SEU-HOST].supabase.co:5432/postgres

# Exemplo:
# DATABASE_URL=postgresql://postgres:suasenha123@db.xxxxxxxxxxxx.supabase.co:5432/postgres
```

**IMPORTANTE**:
- Nunca commite o arquivo `.env` no Git!
- A `DATABASE_URL` está disponível nas configurações do seu projeto Supabase

### 5. Inicie o Servidor

```bash
npm run start-supabase
```

O servidor estará rodando em: `http://localhost:3000`

### 6. Acesse o Sistema

Abra o navegador e acesse:
```
http://localhost:3000/login.html
```

**Credenciais padrão:**
- Email: `admin@igreja.com`
- Senha: `admin123`

## 🌐 Deploy na Vercel

### Passo 1: Prepare o Projeto

1. Certifique-se de que o arquivo `.gitignore` contém:
```
node_modules/
.env
*.log
.DS_Store
```

2. Crie um arquivo `vercel.json` na raiz:
```json
{
  "version": 2,
  "builds": [
    {
      "src": "server-supabase.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "server-supabase.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Passo 2: Configure o Projeto na Vercel

1. Acesse [vercel.com](https://vercel.com)
2. Conecte sua conta GitHub
3. Importe o repositório `membros-igreja`
4. Configure as **Environment Variables**:
   - `DATABASE_URL`: Sua connection string do Supabase
   - `PORT`: 3000

### Passo 3: Deploy

1. Clique em "Deploy"
2. Aguarde o build terminar
3. Acesse a URL fornecida pela Vercel

## 🌐 Deploy na Cloudflare Pages

**IMPORTANTE**: Cloudflare Pages é otimizado para sites estáticos. Para este projeto com backend Node.js, recomendamos usar **Cloudflare Workers** ou **Vercel/Railway**.

### Alternativa: Cloudflare Workers + Pages

1. **Frontend (Pages)**:
   - Deploy apenas a pasta `public/` no Cloudflare Pages

2. **Backend (Workers)**:
   - Migre o `server-supabase.js` para Cloudflare Workers
   - Use Cloudflare D1 ou continue com Supabase

### Recomendação

Para este projeto, sugerimos usar:
- ✅ **Vercel** (melhor opção - suporte nativo para Node.js)
- ✅ **Railway** (alternativa excelente)
- ✅ **Render** (boa opção gratuita)
- ⚠️ **Cloudflare Pages** (requer refatoração para Workers)

## 🚀 Deploy no Railway (Alternativa Recomendada)

### Passo 1: Prepare o Projeto

Adicione um arquivo `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run start-supabase",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Passo 2: Deploy

1. Acesse [railway.app](https://railway.app)
2. Conecte sua conta GitHub
3. Selecione o repositório
4. Adicione a variável de ambiente `DATABASE_URL`
5. Deploy automático!

## 📱 Recursos Mobile

- ✅ Design responsivo
- ✅ PWA (Progressive Web App)
- ✅ Funciona offline (service worker)
- ✅ Pode ser instalado na tela inicial

## 📊 Exportação de Dados

### Planilha Excel
O sistema permite exportar todos os dados dos membros para uma planilha Excel (.xlsx):

**Como usar:**
1. Acesse a página "Lista de Membros"
2. Clique no botão "📊 Exportar Planilha"
3. O arquivo será baixado automaticamente com o nome `membros_YYYY-MM-DD.xlsx`

**Conteúdo da planilha:**
- Nome completo
- Conhecido como
- Sexo
- Data de nascimento
- Telefones (principal e secundário)
- Email
- Endereço completo (rua, número, complemento, bairro, cidade, estado, CEP)
- Tipo de participante
- Cargo
- Data de batismo
- Igreja de origem
- Observações
- Data de cadastro

**Características:**
- ✅ Todas as datas formatadas em PT-BR (DD/MM/AAAA)
- ✅ Colunas com larguras ajustadas automaticamente
- ✅ Requer autenticação
- ✅ Compatível com Excel, Google Sheets e LibreOffice

## 🔒 Segurança

- ✅ Senhas criptografadas com bcryptjs
- ✅ Tokens de sessão com UUID
- ✅ Sessões expiram em 24 horas
- ✅ Validação de permissões no backend
- ✅ Proteção CORS configurável

## 🎨 Cores do Sistema

### Cargos
- **Membro**: Marrom (#8f5a1e)
- **Cooperador**: Amarelo (#8d8400)
- **Diácono**: Verde (#38a038)
- **Presbítero**: Azul (#1881a1)
- **Evangelista**: Azul escuro (#162786)
- **Pastor**: Vermelho (#8b3026)
- **Outros**: Marrom claro (#aa6d45)

### Sexo
- **Masculino**: Azul (#4a90e2)
- **Feminino**: Rosa (#e91e63)

### Tipo
- **Membro**: Verde (#50c878)
- **Congregado**: Laranja (#f39c12)
- **Visitante**: Roxo (#9b59b6)

## 📝 Scripts Disponíveis

```bash
# Iniciar servidor com Supabase
npm run start-supabase

# Iniciar servidor (genérico)
npm start

# Inicializar banco de dados Supabase
npm run init-db-supabase
```

## 🐛 Solução de Problemas

### Erro de Conexão com Banco
- Verifique se a `DATABASE_URL` está correta
- Confirme se o IP está liberado no Supabase (ou desabilite restrições de IP)

### Login não Funciona
- Verifique se o usuário admin foi criado
- Confirme se o hash da senha está correto
- Verifique os logs do servidor

### Gráficos não Aparecem
- Abra o Console do navegador (F12)
- Verifique se há erros JavaScript
- Confirme se os dados estão sendo retornados pela API

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/MinhaFeature`)
3. Commit suas mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. Push para a branch (`git push origin feature/MinhaFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.

## 👨‍💻 Autor

Desenvolvido para a Assembleia de Deus de Rio Claro

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no GitHub.

---

**Nota**: Este é um sistema em produção. Sempre faça backup dos dados antes de atualizar!
