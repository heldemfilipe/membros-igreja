/**
 * Runner de migrations idempotentes.
 *
 *   npm run migrate
 *
 * Executa, em ordem, os arquivos .sql de database/. Todos são idempotentes
 * (CREATE ... IF NOT EXISTS / CREATE OR REPLACE / DROP ... IF EXISTS), então
 * rodar de novo em um banco já populado é seguro.
 *
 * DATABASE_URL é lida de process.env; se ausente, de .env.local e depois .env.
 * Não depende de dotenv (não é dependência do projeto).
 */
const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')

function carregarEnv() {
  if (process.env.DATABASE_URL) return
  for (const arquivo of ['.env.local', '.env']) {
    const caminho = path.join(__dirname, '..', arquivo)
    if (!fs.existsSync(caminho)) continue
    for (const linha of fs.readFileSync(caminho, 'utf8').split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i)
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
      }
    }
  }
}

// Ordem importa: o schema base cria as tabelas que as migrations alteram.
const MIGRATIONS = [
  'schema-supabase.sql',
  'migration-departamentos-familia.sql',
  'migration-fix-constraints.sql',
  'migration-congregacoes-perfis-acesso.sql',
  'migration-indexes.sql',
]

async function main() {
  carregarEnv()
  if (!process.env.DATABASE_URL) {
    console.error('✗ DATABASE_URL não definida (.env.local / .env / ambiente).')
    process.exit(1)
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })

  try {
    for (const nome of MIGRATIONS) {
      const caminho = path.join(__dirname, '..', 'database', nome)
      if (!fs.existsSync(caminho)) {
        console.warn(`  ⚠ ignorado (não encontrado): ${nome}`)
        continue
      }
      const sql = fs.readFileSync(caminho, 'utf8')
      process.stdout.write(`  → ${nome} ... `)
      await pool.query(sql)
      console.log('ok')
    }
    console.log('\n✓ Migrations aplicadas com sucesso.')
  } catch (err) {
    console.error('\n✗ Falha ao aplicar migrations:', err.message)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

main()
