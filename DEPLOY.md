# 🚀 Guia Rápido de Deploy

## ✅ Deploy na Vercel (Recomendado)

### Passo a Passo

1. **Acesse a Vercel**
   - Vá para [vercel.com](https://vercel.com)
   - Faça login com sua conta GitHub

2. **Importe o Projeto**
   - Clique em "Add New" → "Project"
   - Selecione o repositório `membros-igreja`
   - Clique em "Import"

3. **Configure as Variáveis de Ambiente**

   Na seção "Environment Variables", adicione:

   ```
   DATABASE_URL = postgresql://postgres:[SENHA]@[HOST].supabase.co:5432/postgres
   ```

   **Como obter a DATABASE_URL do Supabase:**
   - Acesse [supabase.com](https://supabase.com)
   - Abra seu projeto
   - Vá em "Settings" → "Database"
   - Copie a "Connection String" (modo Postgres)
   - Substitua `[YOUR-PASSWORD]` pela senha real do banco

4. **Deploy**
   - Clique em "Deploy"
   - Aguarde o build (1-2 minutos)
   - Pronto! Você receberá uma URL tipo: `https://membros-igreja.vercel.app`

5. **Acesse o Sistema**
   - Vá para: `https://sua-url.vercel.app/login.html`
   - Login: `admin@igreja.com`
   - Senha: `admin123`

### ⚙️ Configurações Automáticas Deploy

Após o primeiro deploy, qualquer `git push` no GitHub fará deploy automático na Vercel!

---

## 🚂 Deploy no Railway (Alternativa)

### Passo a Passo

1. **Acesse o Railway**
   - Vá para [railway.app](https://railway.app)
   - Faça login com GitHub

2. **Novo Projeto**
   - Clique em "New Project"
   - Selecione "Deploy from GitHub repo"
   - Escolha `membros-igreja`

3. **Configure Variáveis**

   Vá em "Variables" e adicione:
   ```
   DATABASE_URL = sua_connection_string_supabase
   PORT = 3000
   ```

4. **Deploy**
   - O Railway detecta automaticamente Node.js
   - Build e deploy automáticos
   - URL disponível em "Settings" → "Domains"

5. **Gerar Domínio**
   - Clique em "Generate Domain"
   - Você receberá: `https://membros-igreja-production.up.railway.app`

---

## 🎯 Deploy no Render

### Passo a Passo

1. **Acesse o Render**
   - Vá para [render.com](https://render.com)
   - Faça login com GitHub

2. **Novo Web Service**
   - Clique em "New +" → "Web Service"
   - Conecte o repositório `membros-igreja`

3. **Configurações**

   ```
   Name: membros-igreja
   Environment: Node
   Build Command: npm install
   Start Command: npm run start-supabase
   ```

4. **Variáveis de Ambiente**

   Adicione na seção "Environment":
   ```
   DATABASE_URL = sua_connection_string
   ```

5. **Criar Web Service**
   - Clique em "Create Web Service"
   - Aguarde o deploy (3-5 minutos)
   - URL: `https://membros-igreja.onrender.com`

---

## ☁️ Cloudflare Pages + Workers

**IMPORTANTE**: Requer refatoração do backend para Workers

### Apenas Frontend (Static)

Se você quiser apenas hospedar o frontend:

1. **Criar novo projeto no Pages**
   - Conecte o repositório
   - Build settings:
     ```
     Build command: (deixe vazio)
     Build output directory: public
     ```

2. **Deploy**
   - O frontend será hospedado
   - Mas você precisará de um backend separado

### Backend com Workers (Avançado)

Requer migrar `server-supabase.js` para a sintaxe do Cloudflare Workers.

---

## 📊 Configurar Banco de Dados (Supabase)

### 1. Criar Projeto

1. Acesse [supabase.com](https://supabase.com)
2. Clique em "New Project"
3. Escolha:
   - Nome: `igreja-membros`
   - Senha forte (guarde bem!)
   - Região: South America (São Paulo)

### 2. Executar SQL

1. Vá em "SQL Editor"
2. Clique em "New Query"
3. Cole o SQL do arquivo `database/schema.sql` ou copie do README.md
4. Execute

### 3. Criar Usuário Admin

```sql
-- Primeiro, gere o hash da senha
-- Em Node.js local, execute:
-- const bcrypt = require('bcryptjs');
-- console.log(bcrypt.hashSync('admin123', 10));

INSERT INTO usuarios (email, senha, nome, tipo)
VALUES (
    'admin@igreja.com',
    '$2a$10$SEU_HASH_AQUI',
    'Administrador',
    'admin'
);
```

### 4. Obter Connection String

1. Vá em "Settings" → "Database"
2. Copie "Connection string" → "URI"
3. Substitua `[YOUR-PASSWORD]` pela senha do banco
4. Use esta string na variável `DATABASE_URL`

---

## 🔒 Checklist de Segurança

Antes de fazer deploy em produção:

- [ ] Altere a senha padrão do admin (`admin123`)
- [ ] Configure CORS adequadamente
- [ ] Use HTTPS (automático na Vercel/Railway)
- [ ] Não exponha a `.env` no repositório
- [ ] Configure backup automático do Supabase
- [ ] Ative 2FA no Supabase
- [ ] Monitore os logs de acesso

---

## 🐛 Problemas Comuns

### Erro 500 ao fazer login
- Verifique se `DATABASE_URL` está correta
- Confirme se as tabelas foram criadas
- Veja os logs no painel da plataforma

### Página em branco
- Limpe o cache do navegador
- Verifique o console (F12)
- Confirme se os arquivos estáticos estão sendo servidos

### CORS Error
- Adicione sua URL na configuração CORS do `server-supabase.js`
- Certifique-se de que a URL está sem barra no final

---

## 📞 Suporte

- **Documentação Vercel**: [vercel.com/docs](https://vercel.com/docs)
- **Documentação Railway**: [docs.railway.app](https://docs.railway.app)
- **Documentação Supabase**: [supabase.com/docs](https://supabase.com/docs)

---

## ✅ Próximos Passos

Após o deploy:

1. ✅ Acesse `/login.html`
2. ✅ Faça login como admin
3. ✅ Cadastre os primeiros membros
4. ✅ Crie novos usuários (se necessário)
5. ✅ Configure backup regular dos dados
6. ✅ Compartilhe a URL com a equipe

---

**Desenvolvido com ❤️ para a Assembleia de Deus de Rio Claro**
