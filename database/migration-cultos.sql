-- ============================================================
-- MIGRATION: Cultos da semana por congregação
--
-- Lista de dia da semana + horário (+ nome) que cada congregação tem,
-- usada no seletor "Próximo culto" do composer de mensagens e nos novos
-- placeholders {culto} e {horarios} das frases prontas.
-- ============================================================

CREATE TABLE IF NOT EXISTS cultos (
  id             SERIAL PRIMARY KEY,
  congregacao_id INTEGER NOT NULL REFERENCES congregacoes(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  dia_semana     INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0=domingo ... 6=sábado
  horario        TEXT NOT NULL, -- 'HH:MM'
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cultos_congregacao ON cultos(congregacao_id);

-- Melhora o texto de duas frases prontas para usar {culto}, sem sobrescrever
-- frases que o usuário já customizou (só troca se o texto ainda for
-- exatamente o padrão original inserido em migration-mensagem-modelo-extra).
UPDATE mensagem_modelo SET texto =
  'Olá, {nome}! Nosso próximo {culto} será {data} às {hora}. Vai ser uma bênção contar com a sua presença!'
WHERE lower(titulo) = lower('Convite para o próximo culto')
  AND texto = 'Olá, {nome}! Nosso próximo culto será {data} às {hora}. Vai ser uma bênção contar com a sua presença!';

UPDATE mensagem_modelo SET texto =
  'Oi, {nome}! Nosso {culto} é {data} às {hora}. Podemos contar com você? Vai ser uma alegria te receber de novo!'
WHERE lower(titulo) = lower('Confirmar presença no culto')
  AND texto = 'Oi, {nome}! Nosso culto é {data} às {hora}. Podemos contar com você? Vai ser uma alegria te receber de novo!';

-- Nova frase que lista todos os horários cadastrados (placeholder {horarios}).
INSERT INTO mensagem_modelo (titulo, texto)
SELECT v.titulo, v.texto
FROM (VALUES
  ('Horários de culto',
   'Oi, {nome}! Segue nossos horários de culto:
{horarios}
Vai ser uma alegria te ver por lá!')
) AS v(titulo, texto)
WHERE NOT EXISTS (
  SELECT 1 FROM mensagem_modelo m WHERE lower(m.titulo) = lower(v.titulo)
);
