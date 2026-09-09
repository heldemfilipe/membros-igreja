-- ============================================================
-- MIGRATION: Campos novos da ficha (Linha B)
--
-- Origem religiosa (detalhe), observação religiosa / pacto espiritual,
-- quem convidou / conhecidos na igreja, dons e talentos.
-- Tudo aditivo e idempotente — não quebra nada.
-- ============================================================

-- Origem religiosa: a coluna origem_religiosa já existe (vira lista no form);
-- este campo guarda o "qual?" quando a origem for "Outra".
ALTER TABLE membros ADD COLUMN IF NOT EXISTS origem_religiosa_detalhe TEXT;

-- Informação religiosa livre (ex.: pactos, vínculos espirituais, histórico).
ALTER TABLE membros ADD COLUMN IF NOT EXISTS observacao_religiosa TEXT;

-- Quem convidou / conhecidos da pessoa na igreja.
ALTER TABLE membros ADD COLUMN IF NOT EXISTS convidado_por TEXT;

-- Dons e talentos (texto: itens separados por vírgula) e os que gostaria de ter.
ALTER TABLE membros ADD COLUMN IF NOT EXISTS dons_talentos TEXT;
ALTER TABLE membros ADD COLUMN IF NOT EXISTS dons_desejados TEXT;
