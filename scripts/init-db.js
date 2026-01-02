const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

// Criar diretório do banco de dados se não existir
const dbDir = path.join(__dirname, '..', 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'membros.db');

// Conectar ao banco de dados (cria se não existir)
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao criar banco de dados:', err);
        process.exit(1);
    }
    console.log('Banco de dados criado/conectado com sucesso!');
});

// Ler e executar o schema
const schemaPath = path.join(dbDir, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf8');

// Executar cada comando SQL separadamente
db.serialize(() => {
    // Dividir o schema por ponto e vírgula
    const commands = schema.split(';').filter(cmd => cmd.trim().length > 0);

    commands.forEach((command, index) => {
        db.run(command, (err) => {
            if (err) {
                console.error(`Erro ao executar comando ${index + 1}:`, err.message);
            } else {
                console.log(`Comando ${index + 1} executado com sucesso`);
            }
        });
    });

    console.log('\nBanco de dados inicializado com sucesso!');
    console.log('Localização:', dbPath);
});

db.close();
