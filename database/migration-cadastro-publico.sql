-- ============================================================
-- MIGRATION: Cadastro público (Linha C)
--
-- Link livre para a própria pessoa preencher o cadastro, com campos
-- inspirados na ficha "Jornada da Transformação" que a igreja já usa em
-- papel. O admin escolhe quais blocos aparecem; os envios ficam pendentes
-- de revisão da recepção antes de virarem um membro oficial.
-- ============================================================

-- Campos novos de vida espiritual / desafios pessoais (não existiam ainda).
ALTER TABLE membros ADD COLUMN IF NOT EXISTS batizado_espirito_santo BOOLEAN;
ALTER TABLE membros ADD COLUMN IF NOT EXISTS batizado_aguas BOOLEAN;
ALTER TABLE membros ADD COLUMN IF NOT EXISTS vida_ministerial TEXT;
ALTER TABLE membros ADD COLUMN IF NOT EXISTS desafios_pessoais TEXT;

-- Configuração única (linha fixa id=1) de quais blocos opcionais aparecem
-- no formulário público. Nome, telefone e congregação são sempre fixos.
CREATE TABLE IF NOT EXISTS formulario_publico_config (
  id INTEGER PRIMARY KEY DEFAULT 1,
  endereco BOOLEAN NOT NULL DEFAULT TRUE,
  nascimento BOOLEAN NOT NULL DEFAULT TRUE,
  estado_civil BOOLEAN NOT NULL DEFAULT TRUE,
  escolaridade_area BOOLEAN NOT NULL DEFAULT TRUE,
  dons_talentos BOOLEAN NOT NULL DEFAULT TRUE,
  vida_espiritual BOOLEAN NOT NULL DEFAULT TRUE,
  origem_religiosa BOOLEAN NOT NULL DEFAULT TRUE,
  desafios_pessoais BOOLEAN NOT NULL DEFAULT FALSE,
  convidado_por BOOLEAN NOT NULL DEFAULT TRUE,
  observacoes BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT formulario_publico_config_singleton CHECK (id = 1)
);
INSERT INTO formulario_publico_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Envios do formulário público, aguardando revisão antes de virar membro.
CREATE TABLE IF NOT EXISTS cadastros_publicos (
  id SERIAL PRIMARY KEY,
  congregacao_id INTEGER REFERENCES congregacoes(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  dados JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','rejeitado')),
  membro_id INTEGER REFERENCES membros(id) ON DELETE SET NULL,
  revisado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  revisado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cadastros_publicos_status ON cadastros_publicos(status);
CREATE INDEX IF NOT EXISTS idx_cadastros_publicos_congregacao ON cadastros_publicos(congregacao_id);
