-- ============================================================
-- MIGRATION: Quem convidou o visitante
--
-- Campo opcional pra guardar quem convidou o visitante, preenchido no
-- cadastro rápido da Recepção e usado na mensagem de aviso no WhatsApp.
-- Aditiva e idempotente.
-- ============================================================

ALTER TABLE acompanhamento_visitante ADD COLUMN IF NOT EXISTS convidado_por TEXT;
