-- ============================================================
-- MIGRATION: Vida ministerial em perguntas separadas
--
-- Antes era um textão só ("Tem dom espiritual? Já pregou? Já discipulou?
-- É obreiro? Qual função?"). Agora cada uma é uma pergunta Sim/Não no
-- cadastro público, com campo extra aparecendo conforme a resposta —
-- o que deixa o dado utilizável (ex.: listar quem pode pregar).
--
-- A função do obreiro reaproveita a coluna `funcao_igreja`, que já existe.
-- O campo `vida_ministerial` continua, agora como texto livre opcional.
-- ============================================================

ALTER TABLE membros ADD COLUMN IF NOT EXISTS dom_espiritual TEXT;
ALTER TABLE membros ADD COLUMN IF NOT EXISTS ja_pregou BOOLEAN;
ALTER TABLE membros ADD COLUMN IF NOT EXISTS ja_discipulou BOOLEAN;
ALTER TABLE membros ADD COLUMN IF NOT EXISTS foi_discipulado BOOLEAN;
ALTER TABLE membros ADD COLUMN IF NOT EXISTS eh_obreiro BOOLEAN;
