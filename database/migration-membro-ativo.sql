-- Adiciona campo ativo para desativar membros sem excluí-los
ALTER TABLE membros ADD COLUMN IF NOT EXISTS ativo BOOLEAN NOT NULL DEFAULT TRUE;

-- Todos os existentes ficam ativos
UPDATE membros SET ativo = TRUE WHERE ativo IS NULL;
