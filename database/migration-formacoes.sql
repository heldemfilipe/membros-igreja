-- ============================================================
-- MIGRATION: Formação teológica / cursos (Linha B)
--
-- Tabela separada do "histórico eclesiástico" (que é só para eventos como
-- batismo, consagração, ordenação). Aqui entram faculdade, seminário,
-- cursos livres, etc. — incluindo os que estão em andamento.
-- ============================================================

CREATE TABLE IF NOT EXISTS formacoes (
  id            SERIAL PRIMARY KEY,
  membro_id     INTEGER NOT NULL REFERENCES membros(id) ON DELETE CASCADE,
  curso         TEXT NOT NULL,
  instituicao   TEXT,
  ano_inicio    INTEGER,
  ano_conclusao INTEGER,
  situacao      TEXT,           -- Concluído | Cursando | Trancado | Incompleto
  observacoes   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_formacoes_membro ON formacoes(membro_id);
