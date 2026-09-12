-- ============================================================
-- MIGRATION: Dificuldades / áreas em que a pessoa quer ajuda
--
-- Lista marcável no bloco sensível do cadastro público (organização
-- financeira, casamento, gestão emocional, vícios...). Guardada como texto
-- separado por vírgula, no mesmo formato de dons_talentos.
--
-- O texto livre da história/trauma continua em `desafios_pessoais`.
-- ============================================================

ALTER TABLE membros ADD COLUMN IF NOT EXISTS dificuldades TEXT;
