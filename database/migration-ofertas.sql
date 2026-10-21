-- ============================================================
-- MIGRATION: Ofertas por culto
--
-- ofertas            : um lançamento por congregação + data + culto, com o
--                      total por tipo (dízimos, ofertas, missões, outros)
-- oferta_itens       : detalhe OPCIONAL por pessoa (membro cadastrado ou
--                      pessoa pendente de cadastro); nunca passa do total
-- pessoas_pendentes  : quem ofertou mas não tem cadastro — lista para
--                      cadastrar depois
-- ofertas_auditoria  : histórico de criação/edição/exclusão (antes/depois)
-- Aditiva e idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS ofertas (
  id              SERIAL PRIMARY KEY,
  congregacao_id  INTEGER NOT NULL REFERENCES congregacoes(id) ON DELETE CASCADE,
  data_culto      DATE NOT NULL,
  culto_id        INTEGER REFERENCES cultos(id) ON DELETE SET NULL,
  culto_nome      TEXT NOT NULL,
  dizimos         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (dizimos >= 0),
  ofertas         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (ofertas >= 0),
  missoes         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (missoes >= 0),
  outros          NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (outros >= 0),
  observacoes     TEXT,
  lancado_por     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  atualizado_por  INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Um lançamento por culto: o mesmo culto (ou o mesmo nome de culto extra) no mesmo dia.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ofertas_culto
  ON ofertas (congregacao_id, data_culto, lower(culto_nome));
CREATE INDEX IF NOT EXISTS idx_ofertas_cong_data ON ofertas (congregacao_id, data_culto);

CREATE TABLE IF NOT EXISTS pessoas_pendentes (
  id              SERIAL PRIMARY KEY,
  congregacao_id  INTEGER NOT NULL REFERENCES congregacoes(id) ON DELETE CASCADE,
  nome            TEXT NOT NULL,
  telefone        TEXT,
  status          TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'cadastrado', 'descartado')),
  membro_id       INTEGER REFERENCES membros(id) ON DELETE SET NULL,
  origem          TEXT NOT NULL DEFAULT 'oferta',
  criado_por      INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolvido_em    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_pessoas_pendentes_cong ON pessoas_pendentes (congregacao_id, status);

CREATE TABLE IF NOT EXISTS oferta_itens (
  id                 SERIAL PRIMARY KEY,
  oferta_id          INTEGER NOT NULL REFERENCES ofertas(id) ON DELETE CASCADE,
  tipo               TEXT NOT NULL CHECK (tipo IN ('dizimos', 'ofertas', 'missoes', 'outros')),
  valor              NUMERIC(12,2) NOT NULL CHECK (valor > 0),
  membro_id          INTEGER REFERENCES membros(id) ON DELETE SET NULL,
  pessoa_pendente_id INTEGER REFERENCES pessoas_pendentes(id) ON DELETE SET NULL,
  -- nome no momento do lançamento (continua legível se o cadastro for apagado)
  nome               TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_oferta_itens_oferta ON oferta_itens (oferta_id);
CREATE INDEX IF NOT EXISTS idx_oferta_itens_membro ON oferta_itens (membro_id);
CREATE INDEX IF NOT EXISTS idx_oferta_itens_pendente ON oferta_itens (pessoa_pendente_id);

CREATE TABLE IF NOT EXISTS ofertas_auditoria (
  id            SERIAL PRIMARY KEY,
  oferta_id     INTEGER NOT NULL, -- sem FK: o registro sobrevive à exclusão da oferta
  acao          TEXT NOT NULL CHECK (acao IN ('criar', 'editar', 'excluir')),
  usuario_id    INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_nome  TEXT,
  antes         JSONB,
  depois        JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ofertas_auditoria_oferta ON ofertas_auditoria (oferta_id);

ALTER TABLE IF EXISTS ofertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS oferta_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pessoas_pendentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ofertas_auditoria ENABLE ROW LEVEL SECURITY;
