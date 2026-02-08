-- Schema do Banco de Dados para Supabase (PostgreSQL)
-- Sistema de Gerenciamento de Membros da Igreja

-- Tabela de Membros
CREATE TABLE IF NOT EXISTS membros (
    id SERIAL PRIMARY KEY,
    -- Identificação
    nome TEXT NOT NULL,
    conhecido_como TEXT,
    igreja TEXT,
    cargo TEXT,
    sexo TEXT CHECK(sexo IN ('Masculino', 'Feminino')),
    data_nascimento DATE,

    -- Endereço
    cep TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT,
    estado TEXT,

    -- Contato
    telefone_principal TEXT,
    telefone_secundario TEXT,
    email TEXT,

    -- Dados Complementares
    cpf TEXT,
    estado_civil TEXT,
    profissao TEXT,
    identidade TEXT,
    orgao_expedidor TEXT,
    data_expedicao DATE,
    grau_instrucao TEXT,
    titulo_eleitor TEXT,
    titulo_eleitor_zona TEXT,
    titulo_eleitor_secao TEXT,
    tipo_sanguineo TEXT,
    cert_nascimento_casamento TEXT,
    reservista TEXT,
    carteira_motorista TEXT,
    chefe_familiar BOOLEAN DEFAULT FALSE,
    data_casamento DATE,
    naturalidade TEXT,
    uf_naturalidade TEXT,
    nacionalidade TEXT,
    origem_religiosa TEXT,

    -- Tipo de Participante
    tipo_participante TEXT DEFAULT 'Membro' CHECK(tipo_participante IN ('Membro', 'Congregado', 'Visitante')),

    -- Informações Complementares
    informacoes_complementares TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Históricos da Pessoa
CREATE TABLE IF NOT EXISTS historicos (
    id SERIAL PRIMARY KEY,
    membro_id INTEGER NOT NULL,
    tipo TEXT NOT NULL CHECK(tipo IN (
        'Conversão',
        'Batismo nas Águas',
        'Batismo no Espírito Santo',
        'Consagração a Diácono(isa)',
        'Consagração a Presbítero',
        'Ordenação a Evangelista',
        'Ordenação a Pastor(a)'
    )),
    data DATE NOT NULL,
    localidade TEXT,
    observacoes TEXT,
    FOREIGN KEY (membro_id) REFERENCES membros(id) ON DELETE CASCADE
);

-- Tabela de Familiares
CREATE TABLE IF NOT EXISTS familiares (
    id SERIAL PRIMARY KEY,
    membro_id INTEGER NOT NULL,
    parentesco TEXT NOT NULL CHECK(parentesco IN ('Pai', 'Mãe', 'Cônjuge', 'Filho(a)', 'Outro')),
    nome TEXT NOT NULL,
    data_nascimento DATE,
    observacoes TEXT,
    membro_vinculado_id INTEGER REFERENCES membros(id) ON DELETE SET NULL,
    FOREIGN KEY (membro_id) REFERENCES membros(id) ON DELETE CASCADE
);

-- Tabela de Departamentos
CREATE TABLE IF NOT EXISTS departamentos (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de vínculo Membro-Departamento (many-to-many)
CREATE TABLE IF NOT EXISTS membro_departamentos (
    id SERIAL PRIMARY KEY,
    membro_id INTEGER NOT NULL,
    departamento_id INTEGER NOT NULL,
    cargo_departamento TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (membro_id) REFERENCES membros(id) ON DELETE CASCADE,
    FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE CASCADE,
    UNIQUE(membro_id, departamento_id)
);

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL,
    tipo TEXT DEFAULT 'usuario' CHECK(tipo IN ('admin', 'usuario')),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acesso TIMESTAMP
);

-- Tabela de Sessões
CREATE TABLE IF NOT EXISTS sessoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expira_em TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_membros_nome ON membros(nome);
CREATE INDEX IF NOT EXISTS idx_membros_tipo ON membros(tipo_participante);
CREATE INDEX IF NOT EXISTS idx_membros_data_nascimento ON membros(data_nascimento);
CREATE INDEX IF NOT EXISTS idx_historicos_membro ON historicos(membro_id);
CREATE INDEX IF NOT EXISTS idx_familiares_membro ON familiares(membro_id);
CREATE INDEX IF NOT EXISTS idx_familiares_vinculado ON familiares(membro_vinculado_id);
CREATE INDEX IF NOT EXISTS idx_membro_dept_membro ON membro_departamentos(membro_id);
CREATE INDEX IF NOT EXISTS idx_membro_dept_dept ON membro_departamentos(departamento_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_sessoes_token ON sessoes(token);
CREATE INDEX IF NOT EXISTS idx_sessoes_usuario ON sessoes(usuario_id);

-- Trigger para atualizar updated_at em membros
CREATE OR REPLACE FUNCTION update_membros_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_membros_timestamp
BEFORE UPDATE ON membros
FOR EACH ROW
EXECUTE FUNCTION update_membros_timestamp();

-- Trigger para atualizar updated_at em usuários
CREATE OR REPLACE FUNCTION update_usuarios_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_usuarios_timestamp
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION update_usuarios_timestamp();

-- Inserir usuário administrador padrão
-- Senha: admin123
INSERT INTO usuarios (nome, email, senha, tipo)
VALUES ('Administrador', 'admin@igreja.com', '$2a$10$rqL0G8oK5Y5LxQxT5nKZn.1zRJz8oHhR5vZMJW5nqk0c9TQ3rPJBm', 'admin')
ON CONFLICT (email) DO NOTHING;
