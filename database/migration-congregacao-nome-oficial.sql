-- Nome oficial/completo da congregação (ex.: "Assembleia de Deus — Ministério
-- Belém de Rio Claro"), usado no placeholder {congregacao} das frases prontas.
-- Opcional: quando vazio, usa o nome curto normal (c.nome).
ALTER TABLE congregacoes ADD COLUMN IF NOT EXISTS nome_oficial VARCHAR(255);
