-- ============================================================
-- MIGRATION: Pauta da Semana
--
-- A recepção monta, semana a semana, a pauta que o dirigente lê no culto:
-- aniversários, bodas, pedidos de oração e avisos. Cada linha tem um check
-- de "concluído" e pode ser empurrada para a semana seguinte.
--
-- Duas tabelas:
--  * pauta_itens     — o que a recepção digita à mão (avisos, pedidos de
--                      oração e aniversários/bodas de quem NÃO está
--                      cadastrado no sistema).
--  * pauta_marcacoes — só o "check" dos itens que já vêm automáticos do
--                      banco (aniversários/bodas de membros cadastrados).
--                      Não duplicamos os dados do membro aqui: a lista é
--                      recalculada a cada abertura e isto guarda apenas o
--                      que já foi lido/feito naquela semana.
--
-- `semana_inicio` é sempre a SEGUNDA-FEIRA da semana (ISO), para que a
-- mesma semana tenha sempre a mesma chave.
-- ============================================================

CREATE TABLE IF NOT EXISTS pauta_itens (
  id              SERIAL PRIMARY KEY,
  congregacao_id  INTEGER NOT NULL REFERENCES congregacoes(id) ON DELETE CASCADE,
  semana_inicio   DATE NOT NULL,
  tipo            TEXT NOT NULL CHECK (tipo IN ('aniversario', 'bodas', 'oracao', 'aviso')),
  titulo          TEXT NOT NULL,
  descricao       TEXT,
  data_referencia DATE,    -- data do aniversário / das bodas
  telefone        TEXT,
  concluido       BOOLEAN NOT NULL DEFAULT FALSE,
  concluido_em    TIMESTAMPTZ,
  adiado_de       DATE,    -- semana de onde o item veio, quando foi adiado
  criado_por      INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pauta_itens_semana
  ON pauta_itens(congregacao_id, semana_inicio);

CREATE TABLE IF NOT EXISTS pauta_marcacoes (
  id              SERIAL PRIMARY KEY,
  congregacao_id  INTEGER NOT NULL REFERENCES congregacoes(id) ON DELETE CASCADE,
  semana_inicio   DATE NOT NULL,
  chave           TEXT NOT NULL,   -- 'aniversario:123' | 'bodas:45'
  concluido       BOOLEAN NOT NULL DEFAULT TRUE,
  concluido_em    TIMESTAMPTZ DEFAULT NOW(),
  marcado_por     INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT uq_pauta_marcacoes UNIQUE (congregacao_id, semana_inicio, chave)
);

CREATE INDEX IF NOT EXISTS idx_pauta_marcacoes_semana
  ON pauta_marcacoes(congregacao_id, semana_inicio);
