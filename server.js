const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Conexão com o banco de dados
const db = new sqlite3.Database('./database/membros.db', (err) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err);
    } else {
        console.log('Conectado ao banco de dados SQLite');
    }
});

// ========== ROTAS DE MEMBROS ==========

// Listar todos os membros com filtros
app.get('/api/membros', (req, res) => {
    const { tipo, search } = req.query;
    let query = 'SELECT * FROM membros WHERE 1=1';
    const params = [];

    if (tipo) {
        query += ' AND tipo_participante = ?';
        params.push(tipo);
    }

    if (search) {
        query += ' AND (nome LIKE ? OR conhecido_como LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY nome';

    db.all(query, params, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Buscar membro por ID
app.get('/api/membros/:id', (req, res) => {
    const { id } = req.params;

    db.get('SELECT * FROM membros WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        if (!row) {
            res.status(404).json({ error: 'Membro não encontrado' });
            return;
        }

        // Buscar históricos
        db.all('SELECT * FROM historicos WHERE membro_id = ?', [id], (err, historicos) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            // Buscar familiares
            db.all('SELECT * FROM familiares WHERE membro_id = ?', [id], (err, familiares) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }

                res.json({
                    ...row,
                    historicos,
                    familiares
                });
            });
        });
    });
});

// Criar novo membro
app.post('/api/membros', (req, res) => {
    const {
        nome, conhecido_como, igreja, cargo, sexo, data_nascimento,
        cep, logradouro, numero, complemento, bairro, cidade, estado,
        telefone_principal, telefone_secundario, email,
        cpf, estado_civil, profissao, identidade, orgao_expedidor, data_expedicao,
        grau_instrucao, titulo_eleitor, titulo_eleitor_zona, titulo_eleitor_secao,
        tipo_sanguineo, cert_nascimento_casamento, reservista, carteira_motorista,
        chefe_familiar, data_casamento, naturalidade, uf_naturalidade, nacionalidade,
        origem_religiosa, tipo_participante, informacoes_complementares,
        historicos = [], familiares = []
    } = req.body;

    const query = `
        INSERT INTO membros (
            nome, conhecido_como, igreja, cargo, sexo, data_nascimento,
            cep, logradouro, numero, complemento, bairro, cidade, estado,
            telefone_principal, telefone_secundario, email,
            cpf, estado_civil, profissao, identidade, orgao_expedidor, data_expedicao,
            grau_instrucao, titulo_eleitor, titulo_eleitor_zona, titulo_eleitor_secao,
            tipo_sanguineo, cert_nascimento_casamento, reservista, carteira_motorista,
            chefe_familiar, data_casamento, naturalidade, uf_naturalidade, nacionalidade,
            origem_religiosa, tipo_participante, informacoes_complementares
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
        nome, conhecido_como, igreja, cargo, sexo, data_nascimento,
        cep, logradouro, numero, complemento, bairro, cidade, estado,
        telefone_principal, telefone_secundario, email,
        cpf, estado_civil, profissao, identidade, orgao_expedidor, data_expedicao,
        grau_instrucao, titulo_eleitor, titulo_eleitor_zona, titulo_eleitor_secao,
        tipo_sanguineo, cert_nascimento_casamento, reservista, carteira_motorista,
        chefe_familiar ? 1 : 0, data_casamento, naturalidade, uf_naturalidade, nacionalidade,
        origem_religiosa, tipo_participante || 'Membro', informacoes_complementares
    ];

    db.run(query, params, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        const membroId = this.lastID;

        // Inserir históricos
        const historicoPromises = historicos.map(h => {
            return new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO historicos (membro_id, tipo, data, localidade, observacoes) VALUES (?, ?, ?, ?, ?)',
                    [membroId, h.tipo, h.data, h.localidade, h.observacoes],
                    (err) => err ? reject(err) : resolve()
                );
            });
        });

        // Inserir familiares
        const familiarPromises = familiares.map(f => {
            return new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO familiares (membro_id, parentesco, nome, data_nascimento, observacoes) VALUES (?, ?, ?, ?, ?)',
                    [membroId, f.parentesco, f.nome, f.data_nascimento, f.observacoes],
                    (err) => err ? reject(err) : resolve()
                );
            });
        });

        Promise.all([...historicoPromises, ...familiarPromises])
            .then(() => {
                res.json({ id: membroId, message: 'Membro cadastrado com sucesso!' });
            })
            .catch(err => {
                res.status(500).json({ error: err.message });
            });
    });
});

// Atualizar membro
app.put('/api/membros/:id', (req, res) => {
    const { id } = req.params;
    const {
        nome, conhecido_como, igreja, cargo, sexo, data_nascimento,
        cep, logradouro, numero, complemento, bairro, cidade, estado,
        telefone_principal, telefone_secundario, email,
        cpf, estado_civil, profissao, identidade, orgao_expedidor, data_expedicao,
        grau_instrucao, titulo_eleitor, titulo_eleitor_zona, titulo_eleitor_secao,
        tipo_sanguineo, cert_nascimento_casamento, reservista, carteira_motorista,
        chefe_familiar, data_casamento, naturalidade, uf_naturalidade, nacionalidade,
        origem_religiosa, tipo_participante, informacoes_complementares,
        historicos = [], familiares = []
    } = req.body;

    const query = `
        UPDATE membros SET
            nome = ?, conhecido_como = ?, igreja = ?, cargo = ?, sexo = ?, data_nascimento = ?,
            cep = ?, logradouro = ?, numero = ?, complemento = ?, bairro = ?, cidade = ?, estado = ?,
            telefone_principal = ?, telefone_secundario = ?, email = ?,
            cpf = ?, estado_civil = ?, profissao = ?, identidade = ?, orgao_expedidor = ?, data_expedicao = ?,
            grau_instrucao = ?, titulo_eleitor = ?, titulo_eleitor_zona = ?, titulo_eleitor_secao = ?,
            tipo_sanguineo = ?, cert_nascimento_casamento = ?, reservista = ?, carteira_motorista = ?,
            chefe_familiar = ?, data_casamento = ?, naturalidade = ?, uf_naturalidade = ?, nacionalidade = ?,
            origem_religiosa = ?, tipo_participante = ?, informacoes_complementares = ?
        WHERE id = ?
    `;

    const params = [
        nome, conhecido_como, igreja, cargo, sexo, data_nascimento,
        cep, logradouro, numero, complemento, bairro, cidade, estado,
        telefone_principal, telefone_secundario, email,
        cpf, estado_civil, profissao, identidade, orgao_expedidor, data_expedicao,
        grau_instrucao, titulo_eleitor, titulo_eleitor_zona, titulo_eleitor_secao,
        tipo_sanguineo, cert_nascimento_casamento, reservista, carteira_motorista,
        chefe_familiar ? 1 : 0, data_casamento, naturalidade, uf_naturalidade, nacionalidade,
        origem_religiosa, tipo_participante, informacoes_complementares, id
    ];

    db.run(query, params, function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }

        // Deletar históricos e familiares antigos
        db.run('DELETE FROM historicos WHERE membro_id = ?', [id]);
        db.run('DELETE FROM familiares WHERE membro_id = ?', [id]);

        // Inserir novos históricos
        const historicoPromises = historicos.map(h => {
            return new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO historicos (membro_id, tipo, data, localidade, observacoes) VALUES (?, ?, ?, ?, ?)',
                    [id, h.tipo, h.data, h.localidade, h.observacoes],
                    (err) => err ? reject(err) : resolve()
                );
            });
        });

        // Inserir novos familiares
        const familiarPromises = familiares.map(f => {
            return new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO familiares (membro_id, parentesco, nome, data_nascimento, observacoes) VALUES (?, ?, ?, ?, ?)',
                    [id, f.parentesco, f.nome, f.data_nascimento, f.observacoes],
                    (err) => err ? reject(err) : resolve()
                );
            });
        });

        Promise.all([...historicoPromises, ...familiarPromises])
            .then(() => {
                res.json({ message: 'Membro atualizado com sucesso!' });
            })
            .catch(err => {
                res.status(500).json({ error: err.message });
            });
    });
});

// Deletar membro
app.delete('/api/membros/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM membros WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Membro deletado com sucesso!' });
    });
});

// ========== ESTATÍSTICAS ==========

// Dashboard com estatísticas
app.get('/api/dashboard', (req, res) => {
    const stats = {};

    // Total de membros
    db.get('SELECT COUNT(*) as total FROM membros WHERE tipo_participante = "Membro"', [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        stats.total_membros = row.total;

        // Total de congregados
        db.get('SELECT COUNT(*) as total FROM membros WHERE tipo_participante = "Congregado"', [], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            stats.total_congregados = row.total;

            // Total geral
            db.get('SELECT COUNT(*) as total FROM membros', [], (err, row) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                stats.total_geral = row.total;

                // Por sexo
                db.all('SELECT sexo, COUNT(*) as total FROM membros GROUP BY sexo', [], (err, rows) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    stats.por_sexo = rows;

                    // Por tipo
                    db.all('SELECT tipo_participante, COUNT(*) as total FROM membros GROUP BY tipo_participante', [], (err, rows) => {
                        if (err) {
                            res.status(500).json({ error: err.message });
                            return;
                        }
                        stats.por_tipo = rows;

                        res.json(stats);
                    });
                });
            });
        });
    });
});

// Aniversariantes do mês
app.get('/api/aniversariantes', (req, res) => {
    const { mes } = req.query;
    const mesAtual = mes || (new Date().getMonth() + 1);

    const query = `
        SELECT id, nome, conhecido_como, data_nascimento, telefone_principal, tipo_participante
        FROM membros
        WHERE CAST(strftime('%m', data_nascimento) AS INTEGER) = ?
        ORDER BY CAST(strftime('%d', data_nascimento) AS INTEGER)
    `;

    db.all(query, [mesAtual], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});
