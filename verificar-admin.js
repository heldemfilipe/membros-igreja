require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function verificarAdmin() {
    console.log('🔍 Verificando usuário admin...\n');

    try {
        const client = await pool.connect();

        // Buscar todos os usuários
        console.log('1️⃣  Buscando usuários no banco...');
        const result = await client.query('SELECT id, nome, email, tipo, ativo FROM usuarios');

        if (result.rows.length === 0) {
            console.log('❌ NENHUM USUÁRIO ENCONTRADO!\n');
            console.log('Criando usuário admin agora...\n');

            const senhaHash = await bcrypt.hash('admin123', 10);

            await client.query(
                'INSERT INTO usuarios (nome, email, senha, tipo) VALUES ($1, $2, $3, $4)',
                ['Administrador', 'admin@igreja.com', senhaHash, 'admin']
            );

            console.log('✅ Usuário admin criado!');
            console.log('   Email: admin@igreja.com');
            console.log('   Senha: admin123\n');

        } else {
            console.log(`✅ ${result.rows.length} usuário(s) encontrado(s):\n`);
            result.rows.forEach((user, index) => {
                console.log(`${index + 1}. ${user.nome}`);
                console.log(`   Email: ${user.email}`);
                console.log(`   Tipo: ${user.tipo}`);
                console.log(`   Ativo: ${user.ativo ? 'Sim' : 'Não'}`);
                console.log('');
            });

            // Testar senha do admin
            console.log('2️⃣  Testando senha do admin...');
            const admin = await client.query('SELECT * FROM usuarios WHERE email = $1', ['admin@igreja.com']);

            if (admin.rows.length === 0) {
                console.log('❌ Usuário admin@igreja.com NÃO encontrado!');
                console.log('   Criando agora...\n');

                const senhaHash = await bcrypt.hash('admin123', 10);
                await client.query(
                    'INSERT INTO usuarios (nome, email, senha, tipo) VALUES ($1, $2, $3, $4)',
                    ['Administrador', 'admin@igreja.com', senhaHash, 'admin']
                );

                console.log('✅ Usuário admin criado!');
            } else {
                const senhaCorreta = await bcrypt.compare('admin123', admin.rows[0].senha);

                if (senhaCorreta) {
                    console.log('✅ Senha "admin123" está CORRETA!');
                } else {
                    console.log('❌ Senha "admin123" está INCORRETA!');
                    console.log('   Atualizando senha...\n');

                    const senhaHash = await bcrypt.hash('admin123', 10);
                    await client.query(
                        'UPDATE usuarios SET senha = $1 WHERE email = $2',
                        [senhaHash, 'admin@igreja.com']
                    );

                    console.log('✅ Senha atualizada para "admin123"');
                }
            }
        }

        console.log('\n✅ Verificação concluída!');
        console.log('\nTente fazer login novamente:');
        console.log('  Email: admin@igreja.com');
        console.log('  Senha: admin123\n');

        client.release();
        await pool.end();
        process.exit(0);

    } catch (error) {
        console.error('\n❌ Erro:', error.message);
        process.exit(1);
    }
}

verificarAdmin();
