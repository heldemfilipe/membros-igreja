# 🚀 Configuração da Vercel - Passo a Passo

## 📋 Pré-requisitos

1. ✅ Conta na [Vercel](https://vercel.com) (gratuita)
2. ✅ Conta no [Supabase](https://supabase.com) (gratuita)
3. ✅ Repositório no GitHub atualizado

---

## 🔧 Passo 1: Configurar Supabase

### 1.1. Criar Projeto no Supabase

1. Acesse https://supabase.com
2. Clique em "New Project"
3. Preencha:
   - **Name**: `igreja-membros` (ou qualquer nome)
   - **Database Password**: Crie uma senha forte e **ANOTE**
   - **Region**: South America (São Paulo)
4. Clique em "Create new project"
5. Aguarde 2-3 minutos enquanto o projeto é criado

### 1.2. Executar SQL para Criar Tabelas

1. No painel do Supabase, vá em **SQL Editor** (menu lateral esquerdo)
2. Clique em "New Query"
3. Cole o seguinte SQL:

```sql
-- Tabela de Membros
CREATE TABLE IF NOT EXISTS membros (
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
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) DEFAULT 'membro',
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Sessões
CREATE TABLE IF NOT EXISTS sessoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expira_em TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_membros_nome ON membros(nome);
CREATE INDEX IF NOT EXISTS idx_membros_data_nascimento ON membros(data_nascimento);
CREATE INDEX IF NOT EXISTS idx_membros_tipo ON membros(tipo_participante);
CREATE INDEX IF NOT EXISTS idx_membros_cargo ON membros(cargo);
CREATE INDEX IF NOT EXISTS idx_sessoes_token ON sessoes(token);
CREATE INDEX IF NOT EXISTS idx_sessoes_expira ON sessoes(expira_em);
```

4. Clique em **Run** (ou pressione Ctrl+Enter)
5. Você deve ver: "Success. No rows returned"

### 1.3. Criar Usuário Administrador

**IMPORTANTE**: Você precisa gerar o hash da senha primeiro!

#### Opção A: Gerar hash localmente (Recomendado)

1. No seu terminal local, execute:

```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('admin123', 10));"
```

2. Copie o hash gerado (algo como: `$2a$10$abc...xyz`)

3. No **SQL Editor** do Supabase, cole:

```sql
INSERT INTO usuarios (email, senha, nome, tipo, ativo)
VALUES (
    'admin@igreja.com',
    'COLE_O_HASH_AQUI',  -- Substitua pelo hash gerado
    'Administrador',
    'admin',
    TRUE
);
```

4. Execute (Run)

#### Opção B: Usar senha em texto plano (NÃO RECOMENDADO para produção)

```sql
-- APENAS PARA TESTE - Não use em produção!
INSERT INTO usuarios (email, senha, nome, tipo, ativo)
VALUES (
    'admin@igreja.com',
    '$2a$10$rGxH9JdXxJ9YGZJxJ9YGuXxXxXxXxXxXxXxXxXxXxXxXxXxX',
    'Administrador',
    'admin',
    TRUE
);
```

**AVISO**: Este hash é de exemplo. Você DEVE gerar um novo hash com a senha real!

### 1.4. Obter Connection String

1. No Supabase, vá em **Settings** → **Database**
2. Role até "Connection string"
3. Selecione a aba **URI**
4. Copie a string que se parece com:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```
5. Substitua `[YOUR-PASSWORD]` pela senha que você criou no passo 1.1
6. **GUARDE ESTA STRING** - você vai usar na Vercel

---

## 🚀 Passo 2: Deploy na Vercel

### 2.1. Conectar GitHub

1. Acesse https://vercel.com
2. Clique em "Sign Up" ou "Login"
3. Escolha "Continue with GitHub"
4. Autorize a Vercel a acessar seus repositórios

### 2.2. Importar Projeto

1. No dashboard da Vercel, clique em **"Add New..."** → **"Project"**
2. Encontre o repositório `membros-igreja`
3. Clique em **"Import"**

### 2.3. Configurar Variáveis de Ambiente

**MUITO IMPORTANTE!**

Antes de fazer o deploy, você PRECISA configurar a variável de ambiente:

1. Na página de configuração do projeto, role até **"Environment Variables"**
2. Adicione:

   ```
   Key: DATABASE_URL
   Value: postgresql://postgres:[SENHA]@db.xxxxx.supabase.co:5432/postgres
   ```

   (Cole aquela connection string que você copiou do Supabase no passo 1.4)

3. **Importante**: Marque as 3 opções:
   - ✅ Production
   - ✅ Preview
   - ✅ Development

4. Clique em "Add"

### 2.4. Configurações de Build (Opcional)

Se aparecer campos de configuração, use:

```
Build Command: npm install
Output Directory: (deixe vazio ou "public")
Install Command: npm install
Development Command: npm start
```

### 2.5. Deploy!

1. Clique em **"Deploy"**
2. Aguarde 2-5 minutos enquanto a Vercel faz o build
3. Você verá um confete 🎉 quando terminar!

### 2.6. Obter a URL

1. Após o deploy, você verá algo como:
   ```
   https://membros-igreja-xxxxx.vercel.app
   ```
2. Clique na URL para abrir
3. Adicione `/login.html` no final:
   ```
   https://membros-igreja-xxxxx.vercel.app/login.html
   ```

---

## 🔐 Passo 3: Primeiro Acesso

1. Acesse: `https://sua-url.vercel.app/login.html`
2. Faça login com:
   - **Email**: admin@igreja.com
   - **Senha**: admin123 (ou a senha que você definiu)

3. **IMPORTANTE**: Após o primeiro login, **altere a senha**!

---

## ⚙️ Passo 4: Configurações Adicionais (Opcional)

### 4.1. Configurar Domínio Personalizado

1. Na Vercel, vá em **Settings** → **Domains**
2. Clique em "Add"
3. Digite seu domínio (ex: `membros.minhaigreja.com.br`)
4. Siga as instruções para configurar DNS

### 4.2. Configurar Auto-Deploy

Por padrão, a Vercel faz deploy automático quando você faz `git push`:

- ✅ Push na branch `main` → Deploy em Production
- ✅ Push em outras branches → Preview deploy

Para desabilitar (se quiser):
1. Vá em **Settings** → **Git**
2. Desmarque "Automatically deploy from Git"

---

## 🐛 Solução de Problemas

### Erro 500 ao fazer login

**Causa**: DATABASE_URL não configurada ou incorreta

**Solução**:
1. Vá em **Settings** → **Environment Variables**
2. Verifique se `DATABASE_URL` está lá
3. Confirme que a senha está correta
4. Clique em **Redeploy** no topo

### Página em branco

**Causa**: Arquivos estáticos não carregados

**Solução**:
1. Limpe o cache do navegador (Ctrl+Shift+Del)
2. Tente acessar: `/login.html` diretamente
3. Verifique o console (F12) para erros

### Login não funciona

**Causa**: Usuário admin não criado ou senha errada

**Solução**:
1. Verifique no Supabase se o usuário existe:
   ```sql
   SELECT * FROM usuarios WHERE email = 'admin@igreja.com';
   ```
2. Se não existir, execute o SQL do passo 1.3 novamente
3. Confirme que o hash da senha está correto

### Erro ao exportar planilha

**Causa**: Biblioteca xlsx não instalada corretamente

**Solução**:
1. No painel da Vercel, vá em **Deployments**
2. Clique no último deployment
3. Vá em **Build Logs**
4. Procure por erros relacionados a `xlsx`
5. Se necessário, faça um novo push para forçar rebuild

---

## 📊 Monitoramento

### Ver Logs

1. Na Vercel, vá em **Deployments**
2. Clique no deployment ativo
3. Vá em **Functions** ou **Runtime Logs**
4. Você verá todos os logs do servidor em tempo real

### Analytics

A Vercel oferece analytics grátis:
1. Vá em **Analytics**
2. Veja número de visitantes, requests, etc.

---

## 🔄 Atualizar o Sistema

Quando você fizer mudanças no código:

1. Faça as alterações localmente
2. Commit:
   ```bash
   git add .
   git commit -m "Descrição da mudança"
   git push origin main
   ```
3. A Vercel fará deploy automático!
4. Você receberá um email quando terminar

---

## 📱 Testar em Mobile

1. Abra a URL no celular: `https://sua-url.vercel.app/login.html`
2. O sistema é responsivo e funciona perfeitamente em mobile
3. Você pode adicionar à tela inicial (PWA)

---

## ✅ Checklist Final

Antes de considerar o deploy completo, verifique:

- [ ] Banco de dados criado no Supabase
- [ ] Tabelas criadas (membros, usuarios, sessoes)
- [ ] Usuário admin criado
- [ ] Connection string copiada
- [ ] Projeto importado na Vercel
- [ ] DATABASE_URL configurada
- [ ] Deploy concluído com sucesso (🎉)
- [ ] Login funciona
- [ ] Dashboard carrega
- [ ] Pode cadastrar um membro de teste
- [ ] Exportação de planilha funciona
- [ ] Senha do admin alterada

---

## 🎉 Pronto!

Seu sistema está no ar! 🚀

**Próximos passos sugeridos:**

1. Altere a senha do admin
2. Crie outros usuários (se necessário)
3. Cadastre os membros da igreja
4. Configure um domínio personalizado
5. Configure backup automático no Supabase

---

## 📞 Suporte

- **Documentação Vercel**: https://vercel.com/docs
- **Documentação Supabase**: https://supabase.com/docs
- **Issues GitHub**: https://github.com/heldemfilipe/membros-igreja/issues

---

**Desenvolvido com ❤️ para a Assembleia de Deus de Rio Claro**
