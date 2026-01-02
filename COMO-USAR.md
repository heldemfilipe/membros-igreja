# Como Usar o Sistema - Guia Completo

## Sistema Criado ✅

Você agora tem **DOIS sistemas**:

### 1. Sistema Simples (sem autenticação)
- Arquivos: `server.js`, `index.html`, `app.js`
- Para usar localmente sem login
- Iniciar: `npm run start-simples`

### 2. Sistema Completo (COM autenticação) ⭐ RECOMENDADO
- Arquivos: `server-auth.js`, `index-auth.html`, `login.html`, `app-auth.js`
- Sistema seguro com login e multi-usuários
- **PWA** - Instalável como app no celular
- Iniciar: `npm start`

## Para Começar AGORA

### 1. Instalar Dependências
```bash
npm install
```

### 2. Criar o Banco de Dados
```bash
npm run init-db
```

### 3. Iniciar o Servidor
```bash
npm start
```

### 4. Acessar o Sistema
Abra o navegador em: `http://localhost:3000/login.html`

**Login padrão:**
- Email: admin@igreja.com
- Senha: admin123

## Principais Funcionalidades

### Dashboard
- Total de membros, congregados e total geral
- Gráficos de distribuição
- Estatísticas atualizadas em tempo real

### Aniversariantes
- Filtro por mês
- Lista completa com idade e contato
- Ideal para enviar felicitações

### Cadastro de Membros
Campos completos conforme ficha cadastral:
- ✅ Identificação completa
- ✅ Endereço
- ✅ Contato
- ✅ Dados complementares (CPF, RG, etc)
- ✅ Históricos eclesiásticos
- ✅ Familiares (ilimitados)
- ✅ Sem matrícula e sem foto (conforme solicitado)

### Gestão de Usuários (Admin)
- Criar usuários com diferentes permissões
- Usuário comum: Cadastra membros
- Administrador: Gerencia tudo + usuários

## Versão Mobile (APK)

### O sistema já é instalável como app!

#### No Android:
1. Acesse pelo Chrome no celular
2. Menu → "Adicionar à tela inicial"
3. Pronto! Funciona como app nativo

#### No iPhone:
1. Acesse pelo Safari
2. Compartilhar → "Adicionar à Tela de Início"
3. Pronto!

**Não precisa gerar APK!** O PWA funciona como app nativo.

### Vantagens do PWA vs APK tradicional:
- ✅ Não precisa Google Play Store
- ✅ Atualização automática
- ✅ Funciona offline
- ✅ Ícone na tela inicial
- ✅ Funciona em Android E iPhone
- ✅ Sem custo de publicação

## Hospedar na Internet (Compartilhar com Todos)

### Opção MAIS FÁCIL: Render.com (GRATUITO)

1. Crie conta: https://render.com
2. Conecte GitHub
3. New Web Service → Selecione o repositório
4. Configure:
   - Build: `npm install`
   - Start: `node server-auth.js`
5. Adicione Disk para banco de dados
6. Pronto! URL: `https://seu-app.onrender.com`

### Outras Opções Gratuitas:
- **Railway.app** - Deploy automático
- **Replit** - Mais simples
- **Cyclic.sh** - Rápido

## Banco de Dados Compartilhado

### Localmente (seu computador):
- Arquivo: `database/membros.db`
- Apenas você acessa

### Na Nuvem (todos acessam):
Quando hospedar no Render/Railway:
- Use "Persistent Disk" (disco na nuvem)
- Todos os usuários acessam o mesmo banco
- Dados sincronizados automaticamente

### Alternativas de Banco:
Se quiser banco separado na nuvem:

1. **Turso** (SQLite na nuvem) - GRÁTIS
   - https://turso.tech
   - 9GB gratuito
   - Fácil integração

2. **PlanetScale** (MySQL) - GRÁTIS
   - https://planetscale.com
   - 5GB gratuito
   - Requer adaptação do código

3. **Supabase** (PostgreSQL) - GRÁTIS
   - https://supabase.com
   - 500MB gratuito
   - Requer adaptação do código

## Fluxo de Trabalho Completo

### Cenário 1: Uso Local (Secretaria da Igreja)
```bash
npm start
# Acesse: http://localhost:3000/login.html
# Múltiplos usuários na mesma rede
```

### Cenário 2: Uso Online (Acesso de Qualquer Lugar)
1. Hospedar no Render.com
2. Configurar domínio (opcional): `membros.minhaigreja.com`
3. Compartilhar URL com secretários
4. Cada um acessa de casa/celular

### Cenário 3: App no Celular
1. Acesse URL no celular
2. "Adicionar à tela inicial"
3. Use como app nativo
4. Funciona offline (após primeira visita)

## Gerenciar Usuários

### Como Admin, você pode:

1. **Criar usuário secretário:**
   - Login como admin
   - Menu → Usuários
   - + Novo Usuário
   - Tipo: Usuário (sem acesso admin)

2. **Criar outro administrador:**
   - Mesmo processo
   - Tipo: Administrador

3. **Desativar usuário:**
   - Editar usuário
   - Desmarcar "Ativo"
   - Ele não consegue mais fazer login

## Segurança

### O sistema já tem:
- ✅ Senhas criptografadas (bcrypt)
- ✅ Tokens de sessão
- ✅ Expiração automática (24h)
- ✅ Proteção contra acesso não autorizado

### Boas práticas:
1. Altere senha do admin após primeiro acesso
2. Use senhas fortes (mín. 8 caracteres)
3. Não compartilhe senhas
4. Desative usuários que saíram da igreja

## Backup

### Manual:
```bash
npm run backup
```
Cria cópia em `backups/membros-YYYY-MM-DD.db`

### Automático (Windows):
1. Abra "Agendador de Tarefas"
2. Criar Tarefa Básica
3. Ação: `npm run backup` na pasta do projeto
4. Agendar: Diário às 23:00

### Na Nuvem:
Se hospedar no Render:
- Eles fazem backup automático
- Ou configure backup para Google Drive/Dropbox

## Personalizar

### Mudar nome da igreja:
Edite nos arquivos HTML:
- `login.html` (linha 44)
- `index-auth.html` (linha 20)

### Adicionar logo:
1. Crie ícones 192x192 e 512x512
2. Salve como `public/icon-192.png` e `public/icon-512.png`
3. Use logo da sua igreja

### Mudar cores:
Edite `styles.css` (linhas 1-11):
```css
:root {
    --accent-primary: #4a90e2; /* Azul principal */
    --accent-secondary: #50c878; /* Verde */
}
```

## Perguntas Frequentes

**P: Preciso pagar para hospedar?**
R: Não! Render.com, Railway e Replit são gratuitos.

**P: Como faço APK para Android?**
R: Não precisa! O PWA funciona como app nativo.

**P: O banco fica onde?**
R: Localmente em `database/membros.db` ou na nuvem se hospedar.

**P: Quantos usuários posso criar?**
R: Ilimitados!

**P: Funciona offline?**
R: Sim (PWA), mas para salvar precisa internet.

**P: Esqueci a senha do admin, e agora?**
R: Veja INSTALACAO-RAPIDA.md (seção "Resetar senha admin")

**P: Posso instalar em vários computadores?**
R: Sim! Ou melhor: hospede online e acesse de qualquer lugar.

**P: Meus dados estão seguros?**
R: Sim! Senhas criptografadas, tokens de sessão, HTTPS automático na nuvem.

## Próximos Passos Recomendados

### Imediato:
1. ✅ Altere senha do admin
2. ✅ Crie os primeiros usuários
3. ✅ Cadastre alguns membros de teste
4. ✅ Configure backup automático

### Esta Semana:
1. Adicione logo da igreja (ícones)
2. Personalize cores se desejar
3. Cadastre todos os membros
4. Hospede online (Render.com)

### Futuro:
1. Configure domínio próprio
2. Adicione mais funcionalidades se precisar
3. Integre com sistema de dizimos (próxima versão)

## Suporte

**Problemas?**
1. Veja documentação completa: `README-COMPLETO.md`
2. Guia rápido: `INSTALACAO-RAPIDA.md`
3. Verifique logs no terminal

**Tudo funcionando?**
Aproveite o sistema e organize melhor sua igreja! 🙏

---

**Criado com dedicação para facilitar a gestão da sua igreja.**
