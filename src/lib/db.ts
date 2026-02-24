import { Pool } from 'pg'

/**
 * Em ambientes serverless (Vercel), cada invocação de função pode criar
 * sua própria instância do Pool. Para não esgotar as conexões disponíveis
 * no Supabase, usamos max: 1 — cada função usa no máximo 1 conexão.
 *
 * No Supabase, use o pooler em modo Transaction (porta 6543):
 *   DATABASE_URL=postgresql://postgres.[ref]:[senha]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
 *
 * O parâmetro ?pgbouncer=true desativa prepared statements, obrigatório
 * para o modo Transaction do PgBouncer.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 0,
  connectionTimeoutMillis: 5000,
})

export default pool
