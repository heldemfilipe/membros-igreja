# Instalação Rápida - Sistema de Membros da Igreja

## Passo 1: Instalar Node.js
- Baixe em: https://nodejs.org (versão LTS)
- Execute o instalador
- Teste no terminal: `node --version`

## Passo 2: Preparar o Sistema

```bash
# Abra o terminal na pasta do projeto
cd caminho/para/membros-igreja

# Instale as dependências
npm install

# Inicialize o banco de dados
npm run init-db
```

## Passo 3: Iniciar o Servidor

```bash
node server-auth.js
```

Você verá: `Servidor rodando em http://localhost:3000`

## Passo 4: Acessar o Sistema

1. Abra o navegador
2. Acesse: `http://localhost:3000/login.html`
3. Faça login com:
   - Email: `admin@igreja.com`
   - Senha: `admin123`

## Passo 5: Criar Primeiro Usuário

1. No menu, clique em "Usuários"
2. Clique em "+ Novo Usuário"
3. Preencha os dados
4. Selecione o tipo (Usuário ou Administrador)
5. Salve

## Passo 6: Cadastrar Membros

1. Clique em "Cadastrar Membro"
2. Preencha os dados obrigatórios (Nome)
3. Adicione informações complementares
4. Adicione históricos e familiares se desejar
5. Clique em "Salvar"

## Instalar no Celular

### Android:
1. Acesse o sistema pelo Chrome no celular
2. Menu (⋮) → "Adicionar à tela inicial"
3. Confirme

### iPhone:
1. Acesse pelo Safari
2. Botão compartilhar → "Adicionar à Tela de Início"
3. Confirme

## Hospedagem Online (Render.com - GRÁTIS)

### 1. Criar conta GitHub
- Acesse: https://github.com
- Crie uma conta gratuita
- Crie um novo repositório

### 2. Enviar código para GitHub

```bash
git init
git add .
git commit -m "Sistema de Membros"
git remote add origin https://github.com/seu-usuario/seu-repo.git
git push -u origin main
```

### 3. Deploy no Render

1. Acesse: https://render.com
2. Faça login com GitHub
3. Click "New +" → "Web Service"
4. Conecte seu repositório
5. Configure:
   - **Name:** membros-igreja
   - **Build Command:** `npm install`
   - **Start Command:** `node server-auth.js`
6. Click "Create Web Service"

### 4. Adicionar Disco Persistente (para o banco)

1. Na página do serviço, vá em "Disks"
2. Click "Add Disk"
3. Configure:
   - **Name:** database
   - **Mount Path:** `/data`
   - **Size:** 1GB (gratuito)
4. Salve

### 5. Atualizar código para usar disco persistente

No arquivo `server-auth.js`, linha 18, altere:
```javascript
// DE:
const db = new sqlite3.Database('./database/membros.db', ...

// PARA:
const db = new sqlite3.Database('/data/membros.db', ...
```

Commit e push novamente:
```bash
git add .
git commit -m "Atualiza caminho do banco"
git push
```

Render fará deploy automático!

### 6. Acessar sistema online

URL será algo como: `https://membros-igreja.onrender.com`

Acesse: `https://seu-app.onrender.com/login.html`

## Dicas Importantes

### Segurança:
- **Altere a senha do admin** após primeiro acesso
- Crie senhas fortes para novos usuários
- Faça backup do banco regularmente

### Backup:
```bash
# Copie o arquivo
cp database/membros.db backup/membros-2024-01-15.db
```

### Resetar senha admin:
Se esquecer a senha, use SQLite browser:
1. Baixe: https://sqlitebrowser.org
2. Abra `database/membros.db`
3. Vá em "Execute SQL"
4. Cole:
```sql
UPDATE usuarios
SET senha = '$2a$10$rqL0G8oK5Y5LxQxT5nKZn.1zRJz8oHhR5vZMJW5nqk0c9TQ3rPJBm'
WHERE email = 'admin@igreja.com';
```
5. Execute → Senha volta para `admin123`

### Problemas Comuns:

**"npm não reconhecido"**
- Reinstale Node.js
- Reinicie o terminal

**"Porta 3000 em uso"**
- Altere a porta no `server-auth.js` (linha 8)
- Ou feche o outro programa

**"Cannot find module"**
- Execute: `npm install`

**"Database locked"**
- Feche todas as conexões ao banco
- Reinicie o servidor

## Próximos Passos

1. Personalize o nome da igreja no código
2. Adicione os ícones do app (logo da igreja)
3. Configure domínio próprio (opcional)
4. Configure backup automático

## Suporte

- Documentação completa: `README-COMPLETO.md`
- Em caso de dúvidas, verifique os logs no terminal
