-- ============================================================
-- MIGRATION: Frases prontas de WhatsApp (Linha A)
--
-- Modelos de mensagem que a recepção usa para falar com o visitante.
-- Placeholders suportados no texto: {nome}, {data}, {hora}
-- Aditiva e idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS mensagem_modelo (
  id         SERIAL PRIMARY KEY,
  titulo     TEXT NOT NULL,
  texto      TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exemplos iniciais (só quando a tabela está vazia).
INSERT INTO mensagem_modelo (titulo, texto)
SELECT v.titulo, v.texto FROM (VALUES
  ('Agradecer pela visita',
   'Olá, {nome}! Foi uma alegria receber você no nosso culto. Que Deus abençoe a sua semana! 🙏'),
  ('Convite para o próximo culto',
   'Olá, {nome}! Nosso próximo culto será {data} às {hora}. Vai ser uma bênção contar com a sua presença!'),
  ('Marcar uma visita',
   'Olá, {nome}! Gostaríamos de fazer uma visita para conhecer você melhor. Qual dia da semana fica melhor pra você?')
) AS v(titulo, texto)
WHERE NOT EXISTS (SELECT 1 FROM mensagem_modelo);
