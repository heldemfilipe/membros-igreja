-- ============================================================
-- MIGRATION: Faixas etárias editáveis por congregação
--
-- congregacao_id NULL = padrão geral (usado por quem não personalizou).
-- Cada conjunto (padrão ou de uma congregação) cobre todas as idades:
-- começa em 0 e a última faixa (idade_max NULL) não tem limite superior.
-- A consistência (sem buracos/sobreposição) é garantida pela aplicação.
-- Aditiva e idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS faixas_etarias (
  id             SERIAL PRIMARY KEY,
  congregacao_id INTEGER REFERENCES congregacoes(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  idade_min      INTEGER NOT NULL CHECK (idade_min >= 0),
  idade_max      INTEGER CHECK (idade_max IS NULL OR idade_max >= idade_min),
  ordem          INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_faixas_etarias_congregacao ON faixas_etarias(congregacao_id);

-- Padrão geral sugerido (só insere se ainda não existir nenhum).
INSERT INTO faixas_etarias (congregacao_id, nome, idade_min, idade_max, ordem)
SELECT NULL, v.nome, v.min, v.max, v.ordem
FROM (VALUES
  ('Crianças',     0,  11, 1),
  ('Adolescentes', 12, 17, 2),
  ('Jovens',       18, 35, 3),
  ('Adultos',      36, 59, 4),
  ('Idosos',       60, NULL::int, 5)
) AS v(nome, min, max, ordem)
WHERE NOT EXISTS (SELECT 1 FROM faixas_etarias WHERE congregacao_id IS NULL);

ALTER TABLE IF EXISTS faixas_etarias ENABLE ROW LEVEL SECURITY;
