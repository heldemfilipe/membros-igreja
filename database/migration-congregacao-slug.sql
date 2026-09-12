-- ============================================================
-- MIGRATION: Slug da congregação (link de cadastro legível)
--
-- Troca /cadastro/3 por /cadastro/jardim-independencia. O id numérico
-- continua funcionando (links antigos não quebram) — a rota aceita os
-- dois formatos.
-- ============================================================

ALTER TABLE congregacoes ADD COLUMN IF NOT EXISTS slug TEXT;

-- Gera o slug a partir do nome pra quem ainda não tem (unaccent já é
-- usado em outras migrations deste projeto pra busca sem acento).
UPDATE congregacoes
SET slug = trim(both '-' from regexp_replace(lower(unaccent(nome)), '[^a-z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Desempata slugs repetidos (ex.: duas congregações com nome parecido)
-- mantendo o mais antigo limpo e sufixando os demais com o id.
WITH dups AS (
  SELECT id, slug, ROW_NUMBER() OVER (PARTITION BY slug ORDER BY id) AS rn
  FROM congregacoes
)
UPDATE congregacoes c
SET slug = c.slug || '-' || c.id
FROM dups d
WHERE c.id = d.id AND d.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_congregacoes_slug ON congregacoes(slug);
