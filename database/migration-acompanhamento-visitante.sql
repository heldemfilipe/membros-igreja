-- ============================================================
-- MIGRATION: Acompanhamento de visitante (Linha A)
--
-- Checklist de pós-visita, uma linha por visitante.
-- Aditiva e idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS acompanhamento_visitante (
  membro_id          INTEGER PRIMARY KEY REFERENCES membros(id) ON DELETE CASCADE,
  voltou_culto       BOOLEAN NOT NULL DEFAULT FALSE,
  voltou_culto_data  DATE,
  visita_casa_data   DATE,
  visita_casa_feita  BOOLEAN NOT NULL DEFAULT FALSE,
  discipulado        BOOLEAN NOT NULL DEFAULT FALSE,
  discipulador       TEXT,
  observacoes        TEXT,
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Para bancos onde a tabela já existia sem essa coluna:
ALTER TABLE acompanhamento_visitante ADD COLUMN IF NOT EXISTS voltou_culto_data DATE;
