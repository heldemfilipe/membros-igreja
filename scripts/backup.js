const fs = require('fs');
const path = require('path');

// Criar diretório de backups se não existir
const backupDir = path.join(__dirname, '..', 'backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

// Caminho do banco de dados
const dbPath = path.join(__dirname, '..', 'database', 'membros.db');

// Verificar se o banco existe
if (!fs.existsSync(dbPath)) {
    console.error('Erro: Banco de dados não encontrado em:', dbPath);
    process.exit(1);
}

// Nome do backup com data e hora
const now = new Date();
const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
const backupPath = path.join(backupDir, `membros-${timestamp}.db`);

// Copiar arquivo
try {
    fs.copyFileSync(dbPath, backupPath);
    console.log('✓ Backup criado com sucesso!');
    console.log('  Localização:', backupPath);

    // Mostrar tamanho do arquivo
    const stats = fs.statSync(backupPath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log('  Tamanho:', sizeKB, 'KB');

    // Listar backups existentes
    const backups = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('membros-') && f.endsWith('.db'))
        .sort()
        .reverse();

    console.log(`\nBackups existentes: ${backups.length}`);
    if (backups.length > 5) {
        console.log('⚠ Você tem mais de 5 backups. Considere remover os mais antigos.');
    }

} catch (error) {
    console.error('Erro ao criar backup:', error.message);
    process.exit(1);
}
