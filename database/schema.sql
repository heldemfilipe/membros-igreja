-- Schema do Banco de Dados - Sistema de Gerenciamento de Membros da Igreja

-- Tabela de Membros
CREATE TABLE membros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    chefe_familiar BOOLEAN DEFAULT 0,
    data_casamento DATE,
    naturalidade TEXT,
    uf_naturalidade TEXT,
    nacionalidade TEXT,
    origem_religiosa TEXT,

    -- Tipo de Participante
    tipo_participante TEXT DEFAULT 'Membro' CHECK(tipo_participante IN ('Membro', 'Congregado', 'Visitante', 'Frequentador')),

    -- Informações Complementares
    informacoes_complementares TEXT,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Históricos da Pessoa
CREATE TABLE historicos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
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
CREATE TABLE familiares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    membro_id INTEGER NOT NULL,
    parentesco TEXT NOT NULL CHECK(parentesco IN ('Pai', 'Mãe', 'Cônjuge', 'Filho(a)', 'Outro')),
    nome TEXT NOT NULL,
    data_nascimento DATE,
    observacoes TEXT,
    FOREIGN KEY (membro_id) REFERENCES membros(id) ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX idx_membros_nome ON membros(nome);
CREATE INDEX idx_membros_tipo ON membros(tipo_participante);
CREATE INDEX idx_membros_data_nascimento ON membros(data_nascimento);
CREATE INDEX idx_historicos_membro ON historicos(membro_id);
CREATE INDEX idx_familiares_membro ON familiares(membro_id);

-- Tabela de Usuários
CREATE TABLE usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    senha TEXT NOT NULL,
    tipo TEXT DEFAULT 'usuario' CHECK(tipo IN ('admin', 'usuario')),
    ativo BOOLEAN DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ultimo_acesso TIMESTAMP
);

-- Tabela de Sessões
CREATE TABLE sessoes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario_id INTEGER NOT NULL,
    token TEXT NOT NULL UNIQUE,
    expira_em TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Índices para usuários e sessões
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_sessoes_token ON sessoes(token);
CREATE INDEX idx_sessoes_usuario ON sessoes(usuario_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_membros_timestamp
AFTER UPDATE ON membros
BEGIN
    UPDATE membros SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_usuarios_timestamp
AFTER UPDATE ON usuarios
BEGIN
    UPDATE usuarios SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Inserir usuário administrador padrão
-- Senha: admin123 (deve ser alterada no primeiro acesso)
INSERT INTO usuarios (nome, email, senha, tipo)
VALUES ('Administrador', 'admin@igreja.com', '$2a$10$rqL0G8oK5Y5LxQxT5nKZn.1zRJz8oHhR5vZMJW5nqk0c9TQ3rPJBm', 'admin');
