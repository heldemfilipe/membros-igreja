-- ============================================================
-- MIGRATION: Entrada e saída de membros (base do painel de crescimento)
--
-- data_entrada  : quando a pessoa passou a fazer parte (default = cadastro)
-- data_saida    : quando saiu (preenchida ao desativar o membro)
-- motivo_saida  : motivo escolhido na lista (ver MOTIVOS_SAIDA em lib/constants.ts)
-- motivo_saida_outro : texto livre quando motivo_saida = 'Outro'
-- Aditiva e idempotente.
-- ============================================================

ALTER TABLE membros ADD COLUMN IF NOT EXISTS data_entrada DATE;
ALTER TABLE membros ADD COLUMN IF NOT EXISTS data_saida DATE;
ALTER TABLE membros ADD COLUMN IF NOT EXISTS motivo_saida TEXT;
ALTER TABLE membros ADD COLUMN IF NOT EXISTS motivo_saida_outro TEXT;

-- Membros existentes: a entrada é aproximada pela data de cadastro.
UPDATE membros SET data_entrada = created_at::date WHERE data_entrada IS NULL;

ALTER TABLE membros ALTER COLUMN data_entrada SET DEFAULT CURRENT_DATE;

-- Inativos antigos não têm data de saída real: usa a última atualização.
UPDATE membros SET data_saida = COALESCE(updated_at::date, CURRENT_DATE)
WHERE ativo = FALSE AND data_saida IS NULL;

CREATE INDEX IF NOT EXISTS idx_membros_data_entrada ON membros(data_entrada);
CREATE INDEX IF NOT EXISTS idx_membros_data_saida ON membros(data_saida);
