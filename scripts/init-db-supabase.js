require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do PostgreSQL
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function initDatabase() {
    console.log('🚀 Iniciando configuração do banco de dados Supabase...\n');

    try {
        // Testar conexão
        console.log('1️⃣  Testando conexão com Supabase...');
        const client = await pool.connect();
        console.log('   ✓ Conectado com sucesso!\n');

        // Ler schema
        console.log('2️⃣  Lendo schema SQL...');
        const schemaPath = path.join(__dirname, '..', 'database', 'schema-supabase.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        console.log('   ✓ Schema carregado!\n');

        // Executar schema
        console.log('3️⃣  Criando tabelas...');
        await client.query(schema);
        console.log('   ✓ Tabelas criadas com sucesso!\n');

        // Verificar tabelas criadas
        console.log('4️⃣  Verificando tabelas criadas:');
        const result = await client.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_type = 'BASE TABLE'
            ORDER BY table_name;
        `);

        result.rows.forEach(row => {
            console.log(`   ✓ ${row.table_name}`);
        });

        // Verificar usuário admin
        console.log('\n5️⃣  Verificando usuário administrador...');
        const userResult = await client.query('SELECT email FROM usuarios WHERE tipo = $1', ['admin']);
        if (userResult.rows.length > 0) {
            console.log(`   ✓ Usuário admin encontrado: ${userResult.rows[0].email}`);
            console.log('   📧 Email: admin@igreja.com');
            console.log('   🔑 Senha: admin123');
        } else {
            console.log('   ⚠️  Usuário admin não encontrado!');
        }

        client.release();

        console.log('\n✅ Banco de dados configurado com sucesso!');
        console.log('\nPróximos passos:');
        console.log('1. Inicie o servidor: node server-supabase.js');
        console.log('2. Acesse: http://localhost:3000/login.html');
        console.log('3. Login: admin@igreja.com / admin123\n');

        process.exit(0);
    } catch (error) {
        console.error('\n❌ Erro ao configurar banco de dados:');
        console.error(error.message);

        if (error.message.includes('password')) {
            console.log('\n💡 Dica: Verifique se a senha no .env está correta');
            console.log('   DATABASE_URL=postgresql://postgres:SUA_SENHA@...');
        }

        if (error.message.includes('connect')) {
            console.log('\n💡 Dica: Verifique se a URL do Supabase está correta no .env');
            console.log('   1. Acesse: https://supabase.com');
            console.log('   2. Vá em Settings → Database');
            console.log('   3. Copie a Connection String (URI)');
        }

        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Executar
initDatabase();
