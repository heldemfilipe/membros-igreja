-- ============================================================
-- MIGRATION: Índices de performance
--
-- Cobre colunas usadas em filtros/joins frequentes que ainda não
-- tinham índice. Idempotente (IF NOT EXISTS).
-- ============================================================

-- Filtro de acesso por congregação e join congregacoes.nome = membros.igreja
CREATE INDEX IF NOT EXISTS idx_membros_igreja ON membros(igreja);

-- Join usuarios → perfis_acesso (verificarToken / login)
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil ON usuarios(perfil_id);

-- Filtro de departamentos por congregação
CREATE INDEX IF NOT EXISTS idx_departamentos_congregacao ON departamentos(congregacao_id);

-- Limpeza de sessões expiradas (DELETE ... WHERE expira_em < NOW())
CREATE INDEX IF NOT EXISTS idx_sessoes_expira ON sessoes(expira_em);
