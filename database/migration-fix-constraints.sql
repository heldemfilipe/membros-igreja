-- ============================================================
-- MIGRAÇÃO: Corrige constraints de historicos e familiares
-- Execute este script no painel SQL do Supabase
-- ============================================================

-- 1. Corrige o constraint de tipo do histórico eclesiástico
--    (Valores conforme ficha padrão da igreja)
ALTER TABLE historicos DROP CONSTRAINT IF EXISTS historicos_tipo_check;
ALTER TABLE historicos
  ADD CONSTRAINT historicos_tipo_check
  CHECK (tipo IN (
    'Conversão',
    'Batismo nas Águas',
    'Batismo no Espírito Santo',
    'Consagração a Diácono(isa)',
    'Consagração a Presbítero',
    'Ordenação a Evangelista',
    'Ordenação a Pastor(a)'
  ));

-- 2. Corrige o constraint de parentesco dos familiares
--    Adiciona: Irmão(ã), Avô/Avó, Neto(a)
ALTER TABLE familiares DROP CONSTRAINT IF EXISTS familiares_parentesco_check;
ALTER TABLE familiares
  ADD CONSTRAINT familiares_parentesco_check
  CHECK (parentesco IN (
    'Pai',
    'Mãe',
    'Cônjuge',
    'Filho(a)',
    'Irmão(ã)',
    'Avô/Avó',
    'Neto(a)',
    'Outro'
  ));

-- Verifica os constraints criados
SELECT conname, consrc
FROM pg_constraint
WHERE conrelid IN (
  'historicos'::regclass,
  'familiares'::regclass
)
AND contype = 'c';
