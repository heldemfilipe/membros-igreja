-- ==============================================
-- MIGRATION: Departamentos, Vinculo Familiar, Remover Frequentador
-- Rodar este script no Supabase SQL Editor
-- ==============================================

-- 1. Remover "Frequentador" - migrar registros existentes
UPDATE membros SET tipo_participante = 'Congregado' WHERE tipo_participante = 'Frequentador';

-- Atualizar CHECK constraint (remover a antiga e criar nova)
ALTER TABLE membros DROP CONSTRAINT IF EXISTS membros_tipo_participante_check;
ALTER TABLE membros ADD CONSTRAINT membros_tipo_participante_check
  CHECK(tipo_participante IN ('Membro', 'Congregado', 'Visitante'));

-- 2. Tabela de Departamentos
CREATE TABLE IF NOT EXISTS departamentos (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL UNIQUE,
    descricao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela de vinculo Membro-Departamento (many-to-many)
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

-- Se a tabela ja existe, adicionar coluna cargo_departamento
ALTER TABLE membro_departamentos ADD COLUMN IF NOT EXISTS cargo_departamento TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_membro_dept_membro ON membro_departamentos(membro_id);
CREATE INDEX IF NOT EXISTS idx_membro_dept_dept ON membro_departamentos(departamento_id);

-- 4. Adicionar coluna de vinculo familiar na tabela familiares
ALTER TABLE familiares ADD COLUMN IF NOT EXISTS membro_vinculado_id INTEGER REFERENCES membros(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_familiares_vinculado ON familiares(membro_vinculado_id);
