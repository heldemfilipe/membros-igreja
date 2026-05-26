-- ============================================================
-- MIGRATION: Congregações, Perfis de Acesso, Visitas e colunas extras
--
-- Consolida o que antes era criado "on the fly" dentro das rotas da API
-- (lazy migrations). Tudo idempotente — seguro rodar várias vezes.
-- ============================================================

-- Extensão para busca sem acento (unaccent(nome) ILIKE ...)
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Coluna funcao_igreja em membros
ALTER TABLE membros ADD COLUMN IF NOT EXISTS funcao_igreja TEXT;

-- ── Congregações ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS congregacoes (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cidade VARCHAR(255),
    estado VARCHAR(2),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Vínculo de departamento a uma congregação
ALTER TABLE departamentos ADD COLUMN IF NOT EXISTS congregacao_id INTEGER;

-- ── Perfis de acesso (RBAC) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS perfis_acesso (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    permissoes JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vínculo usuário → perfil + restrições de acesso
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS perfil_id INTEGER REFERENCES perfis_acesso(id) ON DELETE SET NULL;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS departamentos_acesso INTEGER[];
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS congregacoes_acesso INTEGER[];

-- ── Visitas ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visitas (
    id          SERIAL PRIMARY KEY,
    membro_id   INTEGER NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
    data_visita DATE NOT NULL DEFAULT CURRENT_DATE,
    observacoes TEXT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_visitas_membro ON visitas(membro_id);
CREATE INDEX IF NOT EXISTS idx_visitas_data   ON visitas(data_visita DESC);
