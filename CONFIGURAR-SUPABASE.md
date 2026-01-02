# Configuração do Supabase - Guia Completo

## O Que é o Supabase?

Supabase é uma plataforma de banco de dados PostgreSQL na nuvem (gratuita até 500MB).
Com ele, **todos os usuários acessam o mesmo banco de dados**, de qualquer lugar!

## Passo 1: Obter Credenciais do Supabase

### 1.1 Acessar o Projeto
1. Acesse: https://supabase.com
2. Faça login
3. Selecione seu projeto: **heldemfilipe's Project**

### 1.2 Encontrar URL do Banco
1. No menu lateral, clique em **Settings** (⚙️)
2. Clique em **Database**
3. Role até "Connection string"
4. Copie a URL que aparece em **URI**

**Formato esperado:**
```
postgresql://postgres.xxxxxxxxxxxx:sNiOiLrDdo1RTbc2@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

### 1.3 Encontrar API URL e Key (Opcional)
1. No menu lateral, clique em **Settings**
2. Clique em **API**
3. Copie:
   - **Project URL** (algo como: https://xxxxx.supabase.co)
   - **anon public** key

## Passo 2: Configurar o Arquivo .env

Edite o arquivo `.env` na raiz do projeto:

```env
# Substitua com suas credenciais reais do Supabase
DATABASE_URL=postgresql://postgres.xxxxxxxxxxxx:sNiOiLrDdo1RTbc2@aws-0-us-east-1.pooler.supabase.com:6543/postgres

# Configurações do Servidor
PORT=3000
NODE_ENV=development
```

### Importante:
- **NÃO compartilhe o arquivo .env** com ninguém
- **NÃO envie para GitHub** (já está no .gitignore)
- Substitua a URL completa com a do seu projeto

## Passo 3: Criar as Tabelas no Supabase

### Opção 1: Usar o SQL Editor (Recomendado)

1. No Supabase, vá em **SQL Editor** (menu lateral)
2. Clique em **New Query**
3. Abra o arquivo `database/schema-supabase.sql`
4. **Copie TODO o conteúdo**
5. **Cole no SQL Editor do Supabase**
6. Clique em **RUN** (ou Ctrl+Enter)

✅ Pronto! Tabelas criadas com sucesso!

### Opção 2: Usar Script Automático

Vou criar um script para você:

```bash
npm run init-db-supabase
```

## Passo 4: Testar a Conexão

```bash
# Instalar dependências
npm install

# Testar conexão
node server-supabase.js
```

Você deve ver:
```
✓ Conectado ao Supabase (PostgreSQL)
Servidor rodando em http://localhost:3000
```

## Passo 5: Iniciar o Sistema

```bash
# Usando Supabase
node server-supabase.js
```

Acesse: http://localhost:3000/login.html

## Verificar se Deu Certo

### No Supabase:
1. Vá em **Table Editor** (menu lateral)
2. Você deve ver as tabelas:
   - ✅ usuarios
   - ✅ sessoes
   - ✅ membros
   - ✅ historicos
   - ✅ familiares

3. Clique em `usuarios`
4. Deve haver 1 registro: admin@igreja.com

### No Sistema:
1. Acesse http://localhost:3000/login.html
2. Login: admin@igreja.com
3. Senha: admin123
4. Se entrar → Funcionou! 🎉

## Diferenças: SQLite vs Supabase

### SQLite (Local):
```
Banco: database/membros.db
❌ Apenas você acessa
❌ Cada computador tem banco separado
✅ Funciona offline
```

### Supabase (Nuvem):
```
Banco: Na nuvem (PostgreSQL)
✅ Todos acessam o mesmo banco
✅ Sincronização automática
✅ Backup automático
❌ Precisa internet
```

## Vantagens do Supabase

1. **Compartilhamento Real**
   - Secretária cadastra em casa
   - Pastor vê na igreja
   - Tudo sincronizado!

2. **Backup Automático**
   - Supabase faz backup diário
   - Você pode exportar quando quiser

3. **Segurança**
   - Conexão criptografada (SSL)
   - Senhas protegidas
   - Acesso controlado

4. **Escalabilidade**
   - Aguenta milhares de membros
   - Múltiplos acessos simultâneos

## Hospedar o Sistema Online

### Com Supabase, hospedar fica MAIS FÁCIL!

#### No Render.com:
1. Não precisa de disco persistente!
2. Configure apenas a variável:
   ```
   DATABASE_URL = sua-url-do-supabase
   ```
3. Deploy e pronto!

#### No Railway:
1. Conecte GitHub
2. Adicione variável DATABASE_URL
3. Deploy automático!

## Gerenciar Dados no Supabase

### Ver Membros Cadastrados:
1. Supabase → **Table Editor**
2. Clique em `membros`
3. Veja todos os registros

### Exportar Dados:
1. Supabase → **Table Editor**
2. Selecione tabela
3. Botão "..." → **Export to CSV**

### Backup Manual:
1. Supabase → **Database**
2. Role até "Database Backups"
3. Configure backups automáticos (gratuito)

### Restaurar Backup:
1. Supabase mantém backups dos últimos 7 dias
2. Settings → Database → Backups
3. Clique em "Restore"

## Limites do Plano Gratuito

✅ **Incluso Grátis:**
- 500 MB de espaço
- 5 GB de transferência/mês
- Unlimited API requests
- 7 dias de backups
- 50,000 usuários autenticados

**Para sua igreja:**
- 500MB = ~100.000 membros cadastrados
- Mais do que suficiente! 🎉

## Resolver Problemas Comuns

### "Error connecting to database"
1. Verifique se DATABASE_URL está correto no .env
2. Teste a URL no Supabase → SQL Editor
3. Confirme que a senha está correta

### "Relation does not exist"
- As tabelas não foram criadas
- Execute o schema-supabase.sql novamente

### "SSL required"
- Já está configurado no código
- Se der erro, adicione `?sslmode=require` na URL

### "Too many connections"
- Plano gratuito: 60 conexões simultâneas
- Reinicie o servidor: `Ctrl+C` e `node server-supabase.js`

## Migrar SQLite → Supabase

Se você já tem dados no SQLite local:

### 1. Exportar do SQLite
```bash
# Instale sqlite3
npm install -g sqlite3

# Exportar para SQL
sqlite3 database/membros.db .dump > backup.sql
```

### 2. Converter para PostgreSQL
```bash
# Use ferramenta online:
# https://sqliteonline.com
# Ou adapte manualmente os tipos
```

### 3. Importar no Supabase
- Cole o SQL adaptado no SQL Editor
- Execute

## Monitoramento

### Ver Logs:
1. Supabase → **Logs**
2. Veja todas as queries executadas
3. Identifique erros

### Ver Performance:
1. Supabase → **Reports**
2. Gráficos de uso
3. Velocidade das queries

## Segurança Extra

### 1. Row Level Security (RLS)
Ative no Supabase para controle por usuário:
```sql
ALTER TABLE membros ENABLE ROW LEVEL SECURITY;
```

### 2. Mudar Senha do Banco
1. Supabase → Settings → Database
2. Clique em "Reset database password"
3. Atualize .env com nova senha

### 3. Whitelist de IPs (Pago)
- Plano pago: Restrinja acesso por IP

## Próximos Passos

1. ✅ Configure .env com suas credenciais
2. ✅ Execute schema-supabase.sql
3. ✅ Teste conexão
4. ✅ Faça login no sistema
5. ✅ Cadastre membros de teste
6. ✅ Hospede online (Render/Railway)
7. ✅ Compartilhe URL com secretaria

## Suporte

**Problemas com Supabase:**
- Documentação: https://supabase.com/docs
- Discord: https://discord.supabase.com

**Problemas com o Sistema:**
- Veja os logs no terminal
- Consulte este guia
- Verifique .env

---

**Agora seu sistema está na nuvem! 🚀**
**Todos os usuários compartilham o mesmo banco de dados!**
