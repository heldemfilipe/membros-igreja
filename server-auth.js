const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
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

// ========== MIDDLEWARE DE AUTENTICAÇÃO ==========
function verificarToken(req, res, next) {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    const tokenLimpo = token.replace('Bearer ', '');

    db.get(
        `SELECT s.*, u.id as user_id, u.nome, u.email, u.tipo, u.ativo
         FROM sessoes s
         JOIN usuarios u ON s.usuario_id = u.id
         WHERE s.token = ? AND s.expira_em > datetime('now')`,
        [tokenLimpo],
        (err, sessao) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (!sessao) {
                return res.status(401).json({ error: 'Token inválido ou expirado' });
            }

            if (!sessao.ativo) {
                return res.status(403).json({ error: 'Usuário inativo' });
            }

            req.usuario = {
                id: sessao.user_id,
                nome: sessao.nome,
                email: sessao.email,
                tipo: sessao.tipo
            };

            next();
        }
    );
}

function verificarAdmin(req, res, next) {
    if (req.usuario.tipo !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    next();
}

// ========== ROTAS DE AUTENTICAÇÃO ==========

// Login
app.post('/api/auth/login', (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    db.get('SELECT * FROM usuarios WHERE email = ? AND ativo = 1', [email], async (err, usuario) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!usuario) {
            return res.status(401).json({ error: 'Email ou senha inválidos' });
        }

        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) {
            return res.status(401).json({ error: 'Email ou senha inválidos' });
        }

        // Gerar token
        const token = uuidv4();
        const expiraEm = new Date();
        expiraEm.setHours(expiraEm.getHours() + 24); // Token válido por 24 horas

        db.run(
            'INSERT INTO sessoes (usuario_id, token, expira_em) VALUES (?, ?, ?)',
            [usuario.id, token, expiraEm.toISOString()],
            (err) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                // Atualizar último acesso
                db.run('UPDATE usuarios SET ultimo_acesso = datetime("now") WHERE id = ?', [usuario.id]);

                res.json({
                    token,
                    usuario: {
                        id: usuario.id,
                        nome: usuario.nome,
                        email: usuario.email,
                        tipo: usuario.tipo
                    }
                });
            }
        );
    });
});

// Logout
app.post('/api/auth/logout', verificarToken, (req, res) => {
    const token = req.headers['authorization'].replace('Bearer ', '');

    db.run('DELETE FROM sessoes WHERE token = ?', [token], (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Logout realizado com sucesso' });
    });
});

// Verificar sessão
app.get('/api/auth/verify', verificarToken, (req, res) => {
    res.json({ usuario: req.usuario });
});

// ========== ROTAS DE USUÁRIOS (ADMIN) ==========

// Listar usuários
app.get('/api/usuarios', verificarToken, verificarAdmin, (req, res) => {
    db.all('SELECT id, nome, email, tipo, ativo, created_at, ultimo_acesso FROM usuarios ORDER BY nome', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Criar usuário
app.post('/api/usuarios', verificarToken, verificarAdmin, async (req, res) => {
    const { nome, email, senha, tipo } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    const senhaCriptografada = await bcrypt.hash(senha, 10);

    db.run(
        'INSERT INTO usuarios (nome, email, senha, tipo) VALUES (?, ?, ?, ?)',
        [nome, email, senhaCriptografada, tipo || 'usuario'],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Email já cadastrado' });
                }
                return res.status(500).json({ error: err.message });
            }
            res.json({ id: this.lastID, message: 'Usuário criado com sucesso' });
        }
    );
});

// Atualizar usuário
app.put('/api/usuarios/:id', verificarToken, verificarAdmin, async (req, res) => {
    const { id } = req.params;
    const { nome, email, senha, tipo, ativo } = req.body;

    let query = 'UPDATE usuarios SET nome = ?, email = ?, tipo = ?, ativo = ?';
    let params = [nome, email, tipo, ativo ? 1 : 0];

    if (senha) {
        const senhaCriptografada = await bcrypt.hash(senha, 10);
        query += ', senha = ?';
        params.push(senhaCriptografada);
    }

    query += ' WHERE id = ?';
    params.push(id);

    db.run(query, params, (err) => {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Email já cadastrado' });
            }
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Usuário atualizado com sucesso' });
    });
});

// Deletar usuário
app.delete('/api/usuarios/:id', verificarToken, verificarAdmin, (req, res) => {
    const { id } = req.params;

    // Não permitir deletar o próprio usuário
    if (parseInt(id) === req.usuario.id) {
        return res.status(400).json({ error: 'Não é possível deletar seu próprio usuário' });
    }

    db.run('DELETE FROM usuarios WHERE id = ?', [id], (err) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Usuário deletado com sucesso' });
    });
});

// Alterar própria senha
app.post('/api/auth/trocar-senha', verificarToken, async (req, res) => {
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
        return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    db.get('SELECT senha FROM usuarios WHERE id = ?', [req.usuario.id], async (err, usuario) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);

        if (!senhaValida) {
            return res.status(401).json({ error: 'Senha atual incorreta' });
        }

        const senhaCriptografada = await bcrypt.hash(novaSenha, 10);

        db.run('UPDATE usuarios SET senha = ? WHERE id = ?', [senhaCriptografada, req.usuario.id], (err) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Senha alterada com sucesso' });
        });
    });
});

// ========== ROTAS DE MEMBROS (PROTEGIDAS) ==========

// Listar todos os membros
app.get('/api/membros', verificarToken, (req, res) => {
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
app.get('/api/membros/:id', verificarToken, (req, res) => {
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

        db.all('SELECT * FROM historicos WHERE membro_id = ?', [id], (err, historicos) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

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
app.post('/api/membros', verificarToken, (req, res) => {
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

        const historicoPromises = historicos.map(h => {
            return new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO historicos (membro_id, tipo, data, localidade, observacoes) VALUES (?, ?, ?, ?, ?)',
                    [membroId, h.tipo, h.data, h.localidade, h.observacoes],
                    (err) => err ? reject(err) : resolve()
                );
            });
        });

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
app.put('/api/membros/:id', verificarToken, (req, res) => {
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

        db.run('DELETE FROM historicos WHERE membro_id = ?', [id]);
        db.run('DELETE FROM familiares WHERE membro_id = ?', [id]);

        const historicoPromises = historicos.map(h => {
            return new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO historicos (membro_id, tipo, data, localidade, observacoes) VALUES (?, ?, ?, ?, ?)',
                    [id, h.tipo, h.data, h.localidade, h.observacoes],
                    (err) => err ? reject(err) : resolve()
                );
            });
        });

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
app.delete('/api/membros/:id', verificarToken, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM membros WHERE id = ?', [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ message: 'Membro deletado com sucesso!' });
    });
});

// ========== ESTATÍSTICAS (PROTEGIDAS) ==========

app.get('/api/dashboard', verificarToken, (req, res) => {
    const stats = {};

    db.get('SELECT COUNT(*) as total FROM membros WHERE tipo_participante = "Membro"', [], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        stats.total_membros = row.total;

        db.get('SELECT COUNT(*) as total FROM membros WHERE tipo_participante = "Congregado"', [], (err, row) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            stats.total_congregados = row.total;

            db.get('SELECT COUNT(*) as total FROM membros', [], (err, row) => {
                if (err) {
                    res.status(500).json({ error: err.message });
                    return;
                }
                stats.total_geral = row.total;

                db.all('SELECT sexo, COUNT(*) as total FROM membros GROUP BY sexo', [], (err, rows) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    stats.por_sexo = rows;

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

app.get('/api/aniversariantes', verificarToken, (req, res) => {
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
    console.log('Login padrão: admin@igreja.com / admin123');
});
