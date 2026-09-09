-- ============================================================
-- MIGRATION: Configuração de recepção por congregação (Linha A)
--
-- Dirigente da congregação + preferências de notificação de visitante.
-- Aditiva e idempotente.
-- ============================================================

-- Membro que é o dirigente (o telefone vem SEMPRE da ficha dele, não é copiado).
ALTER TABLE congregacoes
  ADD COLUMN IF NOT EXISTS dirigente_membro_id INTEGER REFERENCES membros(id) ON DELETE SET NULL;

-- Telefone manual do dirigente (fallback quando ele não é um membro cadastrado
-- ou não tem telefone na ficha).
ALTER TABLE congregacoes ADD COLUMN IF NOT EXISTS dirigente_telefone TEXT;

-- Se deve oferecer o aviso de visitante no WhatsApp para essa congregação.
ALTER TABLE congregacoes ADD COLUMN IF NOT EXISTS notificar_whatsapp BOOLEAN NOT NULL DEFAULT TRUE;

-- Texto opcional de boas-vindas (uso futuro: mensagem ao próprio visitante).
ALTER TABLE congregacoes ADD COLUMN IF NOT EXISTS mensagem_boas_vindas TEXT;
