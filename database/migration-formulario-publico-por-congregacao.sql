-- ============================================================
-- MIGRATION: Configuração do cadastro público, por congregação
--
-- A tabela nasceu com uma linha única (id=1, config global). Agora cada
-- congregação tem a sua própria config — necessário porque o acesso a essa
-- tela passou a poder ser delegado a um gestor/dirigente/secretária de uma
-- congregação específica, que não pode enxergar nem alterar a config de
-- outra congregação.
--
-- Também adiciona o bloco "documentos" (CPF, RG, tipo sanguíneo,
-- naturalidade).
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'formulario_publico_config' AND column_name = 'id'
  ) THEN
    ALTER TABLE formulario_publico_config RENAME TO formulario_publico_config_old;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS formulario_publico_config (
  congregacao_id     INTEGER PRIMARY KEY REFERENCES congregacoes(id) ON DELETE CASCADE,
  endereco           BOOLEAN NOT NULL DEFAULT TRUE,
  nascimento         BOOLEAN NOT NULL DEFAULT TRUE,
  estado_civil       BOOLEAN NOT NULL DEFAULT TRUE,
  escolaridade_area  BOOLEAN NOT NULL DEFAULT TRUE,
  dons_talentos      BOOLEAN NOT NULL DEFAULT TRUE,
  vida_espiritual    BOOLEAN NOT NULL DEFAULT TRUE,
  origem_religiosa   BOOLEAN NOT NULL DEFAULT TRUE,
  documentos         BOOLEAN NOT NULL DEFAULT TRUE,
  desafios_pessoais  BOOLEAN NOT NULL DEFAULT FALSE,
  convidado_por      BOOLEAN NOT NULL DEFAULT TRUE,
  observacoes        BOOLEAN NOT NULL DEFAULT TRUE
);

-- Leva a config antiga (se existia e tinha algo diferente do padrão) para
-- todas as congregações já cadastradas, para ninguém perder o que já tinha
-- configurado.
INSERT INTO formulario_publico_config (
  congregacao_id, endereco, nascimento, estado_civil, escolaridade_area,
  dons_talentos, vida_espiritual, origem_religiosa, desafios_pessoais,
  convidado_por, observacoes
)
SELECT c.id, o.endereco, o.nascimento, o.estado_civil, o.escolaridade_area,
  o.dons_talentos, o.vida_espiritual, o.origem_religiosa, o.desafios_pessoais,
  o.convidado_por, o.observacoes
FROM congregacoes c
CROSS JOIN formulario_publico_config_old o
WHERE o.id = 1
ON CONFLICT (congregacao_id) DO NOTHING;

DROP TABLE IF EXISTS formulario_publico_config_old;
