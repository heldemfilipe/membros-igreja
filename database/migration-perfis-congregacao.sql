-- ============================================================
-- MIGRATION: Perfis de acesso por congregação
--
-- Antes: perfis_acesso eram todos globais e só o admin geral criava/editava.
-- Agora: cada perfil pode pertencer a uma congregação.
--   congregacao_id IS NULL  → perfil GLOBAL (só o admin geral gerencia)
--   congregacao_id = X      → perfil da congregação X (o gestor dela gerencia)
--
-- Tudo idempotente.
-- ============================================================

ALTER TABLE perfis_acesso
  ADD COLUMN IF NOT EXISTS congregacao_id INTEGER REFERENCES congregacoes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_perfis_congregacao ON perfis_acesso(congregacao_id);

-- Nome único por escopo, case-insensitive:
--  - entre os globais (congregacao_id IS NULL)
--  - dentro de cada congregação
-- Substitui o UNIQUE global antigo em "nome".
ALTER TABLE perfis_acesso DROP CONSTRAINT IF EXISTS perfis_acesso_nome_key;

CREATE UNIQUE INDEX IF NOT EXISTS perfis_acesso_nome_global_uk
  ON perfis_acesso (lower(nome))
  WHERE congregacao_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS perfis_acesso_nome_cong_uk
  ON perfis_acesso (congregacao_id, lower(nome))
  WHERE congregacao_id IS NOT NULL;
