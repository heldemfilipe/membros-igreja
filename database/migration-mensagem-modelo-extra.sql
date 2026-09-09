-- ============================================================
-- MIGRATION: Mais frases prontas de WhatsApp (Linha A)
--
-- Adiciona modelos úteis se ainda não existirem (checa pelo título).
-- Idempotente — rodar de novo não duplica.
-- Placeholders: {nome}, {data}, {hora}
-- ============================================================

INSERT INTO mensagem_modelo (titulo, texto)
SELECT v.titulo, v.texto
FROM (VALUES
  ('Agradecer pela visita',
   'Olá, {nome}! Foi uma alegria receber você no nosso culto. Que Deus abençoe a sua semana! 🙏'),
  ('Boas-vindas (após a 1ª visita)',
   'Oi, {nome}! Aqui é da igreja. Que bom ter você com a gente hoje! Se precisar de qualquer coisa ou quiser conversar, é só chamar. Deus abençoe! 🙏'),
  ('Convite para o próximo culto',
   'Olá, {nome}! Nosso próximo culto será {data} às {hora}. Vai ser uma bênção contar com a sua presença!'),
  ('Confirmar presença no culto',
   'Oi, {nome}! Nosso culto é {data} às {hora}. Podemos contar com você? Vai ser uma alegria te receber de novo!'),
  ('Convite para culto especial / evento',
   'Olá, {nome}! Vamos ter um culto especial {data} às {hora}. Vai ser uma noite abençoada e queremos muito contar com você!'),
  ('Convite para o grupo pequeno / célula',
   'Olá, {nome}! Temos um grupo que se reúne durante a semana para um momento de comunhão e oração. Adoraríamos ter você lá — posso te passar os detalhes?'),
  ('Marcar uma visita',
   'Olá, {nome}! Gostaríamos de fazer uma visita para conhecer você melhor. Qual dia da semana fica melhor pra você?'),
  ('Sentimos sua falta',
   'Oi, {nome}! Faz um tempinho que não te vemos nos cultos e ficamos com saudade. Está tudo bem? Vai ser muito bom te receber de novo. 🙌'),
  ('Estamos orando por você',
   'Olá, {nome}! Passando para dizer que a igreja está orando por você e sua família. Se tiver algum pedido de oração, pode compartilhar com a gente. Deus te abençoe!'),
  ('Classe de novos convertidos / batismo',
   'Oi, {nome}! Temos uma turma para quem quer conhecer mais sobre a fé e sobre o batismo. Que tal participar? Posso te explicar como funciona.'),
  ('Feliz aniversário',
   'Feliz aniversário, {nome}! 🎉 Que Deus derrame muitas bênçãos sobre a sua vida neste novo ano. Toda a igreja te deseja um dia especial!')
) AS v(titulo, texto)
WHERE NOT EXISTS (
  SELECT 1 FROM mensagem_modelo m WHERE lower(m.titulo) = lower(v.titulo)
);
