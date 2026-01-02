# Sistema de Gerenciamento de Membros da Igreja - Versão Completa

Sistema completo com autenticação, multi-usuários e suporte a instalação mobile (PWA).

## Novidades da Versão com Autenticação

### Autenticação e Segurança
- Sistema de login com email e senha
- Tokens de sessão com validade de 24 horas
- Senhas criptografadas com bcrypt
- Proteção de todas as rotas da API

### Gestão de Usuários
- Administrador pode criar e gerenciar usuários
- Dois tipos de usuário: Administrador e Usuário
- Controle de usuários ativos/inativos
- Painel administrativo exclusivo

### Progressive Web App (PWA)
- Instalável no celular como app nativo
- Funciona offline após primeira visita
- Ícone na tela inicial do smartphone
- Experiência mobile otimizada

## Como Instalar e Usar

### 1. Instalação Local

```bash
# Instalar dependências
npm install

# Inicializar banco de dados
npm run init-db

# Iniciar servidor
node server-auth.js
```

### 2. Primeiro Acesso

Acesse: `http://localhost:3000/login.html`

**Login padrão:**
- Email: `admin@igreja.com`
- Senha: `admin123`

**IMPORTANTE:** Altere a senha do administrador após o primeiro acesso!

### 3. Instalar no Celular (Android/iPhone)

#### Android (Chrome):
1. Acesse o sistema pelo celular
2. Clique nos 3 pontos (menu)
3. Selecione "Adicionar à tela inicial"
4. Confirme a instalação
5. O app aparecerá como ícone na tela inicial

#### iPhone (Safari):
1. Acesse o sistema pelo celular
2. Toque no botão de compartilhar
3. Selecione "Adicionar à Tela de Início"
4. Confirme a instalação

## Hospedagem Online (Compartilhar na Internet)

### Opção 1: Render.com (RECOMENDADO - GRATUITO)

1. Crie uma conta em https://render.com
2. Conecte seu repositório GitHub
3. Crie um novo "Web Service"
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `node server-auth.js`
5. Adicione o banco de dados como volume persistente

**Banco de Dados na Nuvem:**
- Render oferece disco persistente gratuito
- Configure o caminho: `/data/membros.db`
- Faça backup manual periodicamente

### Opção 2: Railway.app (GRATUITO)

1. Acesse https://railway.app
2. Faça login com GitHub
3. Click em "New Project"
4. Selecione "Deploy from GitHub repo"
5. O sistema detecta Node.js automaticamente

**Vantagem:** Deploy automático a cada atualização no GitHub

### Opção 3: Replit (GRATUITO e FÁCIL)

1. Acesse https://replit.com
2. Crie novo Repl (Node.js)
3. Faça upload dos arquivos
4. Click em "Run"
5. Compartilhe a URL gerada

**Vantagem:** Mais simples, ideal para iniciantes

### Opção 4: Heroku (PAGO após trial)

1. Instale Heroku CLI
2. Crie app: `heroku create nome-do-app`
3. Deploy: `git push heroku main`
4. Configure variáveis de ambiente

### Opção 5: VPS (Servidor Próprio)

#### DigitalOcean / Vultr / Linode (A partir de $5/mês)

```bash
# No servidor
sudo apt update
sudo apt install nodejs npm
git clone seu-repositorio
cd membros-igreja
npm install
npm run init-db

# Manter rodando com PM2
npm install -g pm2
pm2 start server-auth.js
pm2 startup
pm2 save
```

#### Nginx como proxy reverso:
```nginx
server {
    listen 80;
    server_name seudominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Armazenamento do Banco de Dados

### Localmente
- O banco fica em: `database/membros.db`
- Faça backup copiando este arquivo regularmente

### Na Nuvem

#### Render.com:
- Use "Persistent Disk" (gratuito até 1GB)
- Monte em `/data`
- Altere caminho no código: `./data/membros.db`

#### Railway:
- Conecte um volume persistente
- Configure variável: `DATABASE_PATH=/app/data/membros.db`

#### Alternativa: Banco de Dados Externo

Use **Turso** (SQLite na nuvem - GRATUITO):
```bash
npm install @libsql/client

# No código, substitua sqlite3 por libsql
```

Ou **PlanetScale** (MySQL gratuito):
```bash
npm install mysql2
# Adapte queries para MySQL
```

## Backup Automático

Crie script de backup (`scripts/backup.js`):

```javascript
const fs = require('fs');
const path = require('path');

const source = './database/membros.db';
const backup = `./backups/membros-${Date.now()}.db`;

fs.copyFileSync(source, backup);
console.log('Backup criado:', backup);
```

Configure cron (Linux) ou Task Scheduler (Windows) para rodar diariamente.

## Domínio Próprio

### Opções Gratuitas:
- **Freenom:** .tk, .ml, .ga, .cf, .gq (gratuito)
- **No-IP:** Subdomínio gratuito (ex: igreja.ddns.net)

### Opções Pagas (Recomendado):
- **Registro.br:** R$ 40/ano (.com.br)
- **Namecheap:** ~$10/ano (.com)
- **GoDaddy:** Várias opções

## SSL/HTTPS Gratuito

Todas as plataformas modernas oferecem SSL gratuito:
- Render: SSL automático
- Railway: SSL automático
- Replit: SSL automático
- VPS próprio: Use **Let's Encrypt** (gratuito)

```bash
# Com Certbot
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seudominio.com
```

## Segurança Adicional

### 1. Variáveis de Ambiente
Crie arquivo `.env`:
```
PORT=3000
DATABASE_PATH=./database/membros.db
SESSION_SECRET=sua-chave-secreta-aqui
```

### 2. Limite de Requisições
```bash
npm install express-rate-limit

# No server-auth.js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});

app.use('/api/', limiter);
```

### 3. CORS Configurado
```javascript
app.use(cors({
    origin: 'https://seudominio.com',
    credentials: true
}));
```

## Estrutura de Arquivos Atualizada

```
membros-igreja/
├── database/
│   ├── schema.sql
│   └── membros.db
├── public/
│   ├── index-auth.html       # Interface com autenticação
│   ├── login.html            # Tela de login
│   ├── styles.css
│   ├── app-auth.js
│   ├── manifest.json         # Config PWA
│   ├── service-worker.js     # PWA offline
│   ├── icon-192.png          # Ícone app (criar)
│   └── icon-512.png          # Ícone app (criar)
├── scripts/
│   ├── init-db.js
│   └── backup.js
├── server-auth.js            # Servidor com autenticação
├── package.json
├── .gitignore
└── README-COMPLETO.md
```

## Criar Ícones do App

Use ferramentas online:
- **Favicon.io:** https://favicon.io
- **RealFaviconGenerator:** https://realfavicongenerator.net

Suba uma imagem (logo da igreja) e gere ícones nos tamanhos:
- 192x192px → `icon-192.png`
- 512x512px → `icon-512.png`

## Funcionalidades do Sistema

### Para Todos os Usuários:
- Ver dashboard com estatísticas
- Ver aniversariantes do mês
- Cadastrar novos membros
- Editar membros existentes
- Excluir membros
- Buscar e filtrar membros

### Apenas para Administradores:
- Criar novos usuários
- Editar usuários
- Desativar/ativar usuários
- Excluir usuários
- Alterar permissões (admin/usuário)

## Custos Estimados

### Opção Gratuita Total:
- **Hosting:** Render.com ou Railway (gratuito)
- **Domínio:** Freenom (.tk, .ml) ou subdomínio
- **SSL:** Incluído grátis
- **Banco:** SQLite local (incluído)
- **Total:** R$ 0/mês

### Opção Profissional:
- **Hosting:** DigitalOcean ($6/mês)
- **Domínio:** Registro.br (R$ 40/ano)
- **SSL:** Let's Encrypt (gratuito)
- **Backup:** Backblaze B2 ($0.005/GB)
- **Total:** ~R$ 35/mês

### Opção Premium:
- **Hosting:** AWS ou Azure ($20-50/mês)
- **Banco:** RDS ou Azure SQL ($20/mês)
- **CDN:** Cloudflare (gratuito)
- **Domain:** .com profissional (R$ 60/ano)
- **Total:** ~R$ 200-300/mês

## Recomendação

**Para começar:** Use Render.com (gratuito) com domínio gratuito
**Para crescer:** DigitalOcean ($6/mês) com domínio .com.br
**Para organizações grandes:** AWS com banco RDS

## Perguntas Frequentes

### Como resetar senha do admin?
Execute no banco de dados:
```sql
UPDATE usuarios
SET senha = '$2a$10$rqL0G8oK5Y5LxQxT5nKZn.1zRJz8oHhR5vZMJW5nqk0c9TQ3rPJBm'
WHERE email = 'admin@igreja.com';
```
Senha volta para: `admin123`

### Como fazer backup?
Copie o arquivo `database/membros.db` para local seguro (Google Drive, Dropbox, etc)

### Como migrar de servidor?
1. Faça backup do banco (`membros.db`)
2. Instale no novo servidor
3. Substitua o banco pelo backup
4. Configure domínio/DNS

### O app funciona offline?
Sim, após a primeira visita, graças ao PWA. Mas para salvar dados precisa de conexão.

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs: `pm2 logs` ou console do navegador
2. Confirme que o banco foi inicializado
3. Verifique se as portas estão liberadas
4. Teste em modo de navegação anônima

## Licença

MIT License - Livre para uso, modificação e distribuição.
