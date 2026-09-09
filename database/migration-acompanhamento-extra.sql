-- ============================================================
-- MIGRATION: Acompanhamento de visitante — campos extras (Linha A)
--
-- Contato, visita agendada, dados de discipulado, batismo, etc.
-- Aditiva e idempotente.
-- ============================================================

-- Contato (ligou / chamou no WhatsApp)
ALTER TABLE acompanhamento_visitante ADD COLUMN IF NOT EXISTS contato_feito BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE acompanhamento_visitante ADD COLUMN IF NOT EXISTS contato_por   TEXT;
ALTER TABLE acompanhamento_visitante ADD COLUMN IF NOT EXISTS contato_data  DATE;

-- Visita agendada (quem marcou; a data em si já é visita_casa_data)
ALTER TABLE acompanhamento_visitante ADD COLUMN IF NOT EXISTS visita_agendada     BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE acompanhamento_visitante ADD COLUMN IF NOT EXISTS visita_agendada_por TEXT;

-- Discipulado — data de início (discipulador já existe)
ALTER TABLE acompanhamento_visitante ADD COLUMN IF NOT EXISTS discipulado_inicio DATE;

-- Dados do visitante
ALTER TABLE acompanhamento_visitante ADD COLUMN IF NOT EXISTS batizado           BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE acompanhamento_visitante ADD COLUMN IF NOT EXISTS congregacao_origem TEXT;
