-- Garante RLS ativo (sem policies) em todas as tabelas da app, mesmo padrão
-- que já estava manualmente ligado nas tabelas mais antigas via dashboard do
-- Supabase. A app conecta como role `postgres` via DATABASE_URL e ignora RLS
-- de qualquer forma; isso só bloqueia acesso via API PostgREST (anon/authenticated),
-- que esta app não usa. Idempotente: religar RLS já ligado não dá erro.
ALTER TABLE IF EXISTS membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS historicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS familiares ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS membro_departamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sessoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS congregacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS perfis_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS formacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS acompanhamento_visitante ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mensagem_modelo ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS formulario_publico_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cadastros_publicos ENABLE ROW LEVEL SECURITY;
