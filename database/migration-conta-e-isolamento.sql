-- ============================================================
-- MIGRATION: "Minha Conta" + isolamento por congregação
--
-- 1. Coluna para forçar a troca de senha no próximo acesso do usuário.
-- 2. Coluna de auditoria de quando a senha foi trocada pela última vez.
--
-- Tudo idempotente — seguro rodar várias vezes.
-- ============================================================

-- ── Troca de senha obrigatória ─────────────────────────────
-- Quando TRUE, o usuário é levado a uma tela de troca de senha
-- obrigatória logo após o login e não consegue usar o sistema
-- até definir uma nova senha. Ao trocar, volta para FALSE.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS deve_trocar_senha BOOLEAN NOT NULL DEFAULT FALSE;

-- Marca a última vez que a senha foi alterada (auditoria).
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS senha_alterada_em TIMESTAMPTZ;
