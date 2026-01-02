require('dotenv').config();
const { Pool } = require('pg');

console.log('🔍 Testando conexão com Supabase...\n');

// Mostrar URL (ocultando senha)
const url = process.env.DATABASE_URL;
if (!url) {
    console.error('❌ DATABASE_URL não encontrada no .env');
    process.exit(1);
}

const urlMasked = url.replace(/:([^@]+)@/, ':****@');
console.log('URL configurada:', urlMasked);
console.log('');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function test() {
    try {
        console.log('Tentando conectar...');
        const client = await pool.connect();
        console.log('✅ Conexão estabelecida com sucesso!\n');

        // Testar query simples
        console.log('Testando query...');
        const result = await client.query('SELECT NOW()');
        console.log('✅ Query executada:', result.rows[0].now);
        console.log('');

        // Verificar se tabelas existem
        console.log('Verificando tabelas...');
        const tables = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        if (tables.rows.length === 0) {
            console.log('⚠️  NENHUMA TABELA ENCONTRADA!');
            console.log('   Execute: npm run init-db-supabase');
        } else {
            console.log('✅ Tabelas encontradas:');
            tables.rows.forEach(row => {
                console.log(`   - ${row.table_name}`);
            });
        }

        client.release();
        await pool.end();

        console.log('\n✅ Teste concluído com sucesso!');
        process.exit(0);

    } catch (error) {
        console.error('\n❌ ERRO:', error.message);
        console.error('\n📋 Detalhes:', error);

        if (error.message.includes('password')) {
            console.log('\n💡 Verifique a senha no .env');
        }
        if (error.message.includes('connect')) {
            console.log('\n💡 Verifique a URL do Supabase no .env');
        }

        process.exit(1);
    }
}

test();
