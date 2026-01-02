require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Configuração do PostgreSQL (Supabase)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Testar conexão
pool.connect((err, client, release) => {
    if (err) {
        console.error('Erro ao conectar ao banco de dados:', err.stack);
    } else {
        console.log('✓ Conectado ao Supabase (PostgreSQL)');
        release();
    }
});

// ========== MIDDLEWARE DE AUTENTICAÇÃO ==========
async function verificarToken(req, res, next) {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ error: 'Token não fornecido' });
    }

    const tokenLimpo = token.replace('Bearer ', '');

    try {
        const result = await pool.query(
            `SELECT s.*, u.id as user_id, u.nome, u.email, u.tipo, u.ativo
             FROM sessoes s
             JOIN usuarios u ON s.usuario_id = u.id
             WHERE s.token = $1 AND s.expira_em > NOW()`,
            [tokenLimpo]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Token inválido ou expirado' });
        }

        const sessao = result.rows[0];

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
    } catch (error) {
        console.error('Erro na verificação do token:', error);
        res.status(500).json({ error: error.message });
    }
}

function verificarAdmin(req, res, next) {
    if (req.usuario.tipo !== 'admin') {
        return res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    }
    next();
}

// ========== ROTAS DE AUTENTICAÇÃO ==========

// Login
app.post('/api/auth/login', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM usuarios WHERE email = $1 AND ativo = TRUE',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Email ou senha inválidos' });
        }

        const usuario = result.rows[0];
        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) {
            return res.status(401).json({ error: 'Email ou senha inválidos' });
        }

        // Gerar token
        const token = uuidv4();
        const expiraEm = new Date();
        expiraEm.setHours(expiraEm.getHours() + 24);

        await pool.query(
            'INSERT INTO sessoes (usuario_id, token, expira_em) VALUES ($1, $2, $3)',
            [usuario.id, token, expiraEm]
        );

        // Atualizar último acesso
        await pool.query(
            'UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1',
            [usuario.id]
        );

        res.json({
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email,
                tipo: usuario.tipo
            }
        });
    } catch (error) {
        console.error('Erro no login:', error);
        res.status(500).json({ error: error.message });
    }
});

// Logout
app.post('/api/auth/logout', verificarToken, async (req, res) => {
    const token = req.headers['authorization'].replace('Bearer ', '');

    try {
        await pool.query('DELETE FROM sessoes WHERE token = $1', [token]);
        res.json({ message: 'Logout realizado com sucesso' });
    } catch (error) {
        console.error('Erro no logout:', error);
        res.status(500).json({ error: error.message });
    }
});

// Verificar sessão
app.get('/api/auth/verify', verificarToken, (req, res) => {
    res.json({ usuario: req.usuario });
});

// ========== ROTAS DE USUÁRIOS (ADMIN) ==========

// Listar usuários
app.get('/api/usuarios', verificarToken, verificarAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, nome, email, tipo, ativo, created_at, ultimo_acesso FROM usuarios ORDER BY nome'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar usuários:', error);
        res.status(500).json({ error: error.message });
    }
});

// Criar usuário
app.post('/api/usuarios', verificarToken, verificarAdmin, async (req, res) => {
    const { nome, email, senha, tipo } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }

    try {
        const senhaCriptografada = await bcrypt.hash(senha, 10);

        const result = await pool.query(
            'INSERT INTO usuarios (nome, email, senha, tipo) VALUES ($1, $2, $3, $4) RETURNING id',
            [nome, email, senhaCriptografada, tipo || 'usuario']
        );

        res.json({ id: result.rows[0].id, message: 'Usuário criado com sucesso' });
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            res.status(400).json({ error: 'Email já cadastrado' });
        } else {
            console.error('Erro ao criar usuário:', error);
            res.status(500).json({ error: error.message });
        }
    }
});

// Atualizar usuário
app.put('/api/usuarios/:id', verificarToken, verificarAdmin, async (req, res) => {
    const { id } = req.params;
    const { nome, email, senha, tipo, ativo } = req.body;

    try {
        let query, params;

        if (senha) {
            const senhaCriptografada = await bcrypt.hash(senha, 10);
            query = 'UPDATE usuarios SET nome = $1, email = $2, senha = $3, tipo = $4, ativo = $5 WHERE id = $6';
            params = [nome, email, senhaCriptografada, tipo, ativo, id];
        } else {
            query = 'UPDATE usuarios SET nome = $1, email = $2, tipo = $3, ativo = $4 WHERE id = $5';
            params = [nome, email, tipo, ativo, id];
        }

        await pool.query(query, params);
        res.json({ message: 'Usuário atualizado com sucesso' });
    } catch (error) {
        if (error.code === '23505') {
            res.status(400).json({ error: 'Email já cadastrado' });
        } else {
            console.error('Erro ao atualizar usuário:', error);
            res.status(500).json({ error: error.message });
        }
    }
});

// Deletar usuário
app.delete('/api/usuarios/:id', verificarToken, verificarAdmin, async (req, res) => {
    const { id } = req.params;

    if (parseInt(id) === req.usuario.id) {
        return res.status(400).json({ error: 'Não é possível deletar seu próprio usuário' });
    }

    try {
        await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
        res.json({ message: 'Usuário deletado com sucesso' });
    } catch (error) {
        console.error('Erro ao deletar usuário:', error);
        res.status(500).json({ error: error.message });
    }
});

// Alterar própria senha
app.post('/api/auth/trocar-senha', verificarToken, async (req, res) => {
    const { senhaAtual, novaSenha } = req.body;

    if (!senhaAtual || !novaSenha) {
        return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    try {
        const result = await pool.query('SELECT senha FROM usuarios WHERE id = $1', [req.usuario.id]);
        const usuario = result.rows[0];

        const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);

        if (!senhaValida) {
            return res.status(401).json({ error: 'Senha atual incorreta' });
        }

        const senhaCriptografada = await bcrypt.hash(novaSenha, 10);
        await pool.query('UPDATE usuarios SET senha = $1 WHERE id = $2', [senhaCriptografada, req.usuario.id]);

        res.json({ message: 'Senha alterada com sucesso' });
    } catch (error) {
        console.error('Erro ao trocar senha:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== ROTAS DE MEMBROS (PROTEGIDAS) ==========

// Listar todos os membros
app.get('/api/membros', verificarToken, async (req, res) => {
    const { tipo, search } = req.query;

    try {
        let query = 'SELECT * FROM membros WHERE 1=1';
        const params = [];
        let paramCount = 1;

        if (tipo) {
            query += ` AND tipo_participante = $${paramCount}`;
            params.push(tipo);
            paramCount++;
        }

        if (search) {
            query += ` AND (nome ILIKE $${paramCount} OR conhecido_como ILIKE $${paramCount + 1})`;
            params.push(`%${search}%`, `%${search}%`);
            paramCount += 2;
        }

        query += ' ORDER BY nome';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao listar membros:', error);
        res.status(500).json({ error: error.message });
    }
});

// Buscar membro por ID
app.get('/api/membros/:id', verificarToken, async (req, res) => {
    const { id } = req.params;

    try {
        const membroResult = await pool.query('SELECT * FROM membros WHERE id = $1', [id]);

        if (membroResult.rows.length === 0) {
            return res.status(404).json({ error: 'Membro não encontrado' });
        }

        const historicosResult = await pool.query('SELECT * FROM historicos WHERE membro_id = $1', [id]);
        const familiaresResult = await pool.query('SELECT * FROM familiares WHERE membro_id = $1', [id]);

        res.json({
            ...membroResult.rows[0],
            historicos: historicosResult.rows,
            familiares: familiaresResult.rows
        });
    } catch (error) {
        console.error('Erro ao buscar membro:', error);
        res.status(500).json({ error: error.message });
    }
});

// Criar novo membro
app.post('/api/membros', verificarToken, async (req, res) => {
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

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const membroResult = await client.query(
            `INSERT INTO membros (
                nome, conhecido_como, igreja, cargo, sexo, data_nascimento,
                cep, logradouro, numero, complemento, bairro, cidade, estado,
                telefone_principal, telefone_secundario, email,
                cpf, estado_civil, profissao, identidade, orgao_expedidor, data_expedicao,
                grau_instrucao, titulo_eleitor, titulo_eleitor_zona, titulo_eleitor_secao,
                tipo_sanguineo, cert_nascimento_casamento, reservista, carteira_motorista,
                chefe_familiar, data_casamento, naturalidade, uf_naturalidade, nacionalidade,
                origem_religiosa, tipo_participante, informacoes_complementares
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37, $38)
            RETURNING id`,
            [
                nome, conhecido_como, igreja, cargo, sexo, data_nascimento,
                cep, logradouro, numero, complemento, bairro, cidade, estado,
                telefone_principal, telefone_secundario, email,
                cpf, estado_civil, profissao, identidade, orgao_expedidor, data_expedicao,
                grau_instrucao, titulo_eleitor, titulo_eleitor_zona, titulo_eleitor_secao,
                tipo_sanguineo, cert_nascimento_casamento, reservista, carteira_motorista,
                chefe_familiar || false, data_casamento, naturalidade, uf_naturalidade, nacionalidade,
                origem_religiosa, tipo_participante || 'Membro', informacoes_complementares
            ]
        );

        const membroId = membroResult.rows[0].id;

        // Inserir históricos
        for (const h of historicos) {
            await client.query(
                'INSERT INTO historicos (membro_id, tipo, data, localidade, observacoes) VALUES ($1, $2, $3, $4, $5)',
                [membroId, h.tipo, h.data, h.localidade, h.observacoes]
            );
        }

        // Inserir familiares
        for (const f of familiares) {
            await client.query(
                'INSERT INTO familiares (membro_id, parentesco, nome, data_nascimento, observacoes) VALUES ($1, $2, $3, $4, $5)',
                [membroId, f.parentesco, f.nome, f.data_nascimento, f.observacoes]
            );
        }

        await client.query('COMMIT');
        res.json({ id: membroId, message: 'Membro cadastrado com sucesso!' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao criar membro:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Atualizar membro
app.put('/api/membros/:id', verificarToken, async (req, res) => {
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

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        await client.query(
            `UPDATE membros SET
                nome = $1, conhecido_como = $2, igreja = $3, cargo = $4, sexo = $5, data_nascimento = $6,
                cep = $7, logradouro = $8, numero = $9, complemento = $10, bairro = $11, cidade = $12, estado = $13,
                telefone_principal = $14, telefone_secundario = $15, email = $16,
                cpf = $17, estado_civil = $18, profissao = $19, identidade = $20, orgao_expedidor = $21, data_expedicao = $22,
                grau_instrucao = $23, titulo_eleitor = $24, titulo_eleitor_zona = $25, titulo_eleitor_secao = $26,
                tipo_sanguineo = $27, cert_nascimento_casamento = $28, reservista = $29, carteira_motorista = $30,
                chefe_familiar = $31, data_casamento = $32, naturalidade = $33, uf_naturalidade = $34, nacionalidade = $35,
                origem_religiosa = $36, tipo_participante = $37, informacoes_complementares = $38
            WHERE id = $39`,
            [
                nome, conhecido_como, igreja, cargo, sexo, data_nascimento,
                cep, logradouro, numero, complemento, bairro, cidade, estado,
                telefone_principal, telefone_secundario, email,
                cpf, estado_civil, profissao, identidade, orgao_expedidor, data_expedicao,
                grau_instrucao, titulo_eleitor, titulo_eleitor_zona, titulo_eleitor_secao,
                tipo_sanguineo, cert_nascimento_casamento, reservista, carteira_motorista,
                chefe_familiar || false, data_casamento, naturalidade, uf_naturalidade, nacionalidade,
                origem_religiosa, tipo_participante, informacoes_complementares, id
            ]
        );

        // Deletar históricos e familiares antigos
        await client.query('DELETE FROM historicos WHERE membro_id = $1', [id]);
        await client.query('DELETE FROM familiares WHERE membro_id = $1', [id]);

        // Inserir novos históricos
        for (const h of historicos) {
            await client.query(
                'INSERT INTO historicos (membro_id, tipo, data, localidade, observacoes) VALUES ($1, $2, $3, $4, $5)',
                [id, h.tipo, h.data, h.localidade, h.observacoes]
            );
        }

        // Inserir novos familiares
        for (const f of familiares) {
            await client.query(
                'INSERT INTO familiares (membro_id, parentesco, nome, data_nascimento, observacoes) VALUES ($1, $2, $3, $4, $5)',
                [id, f.parentesco, f.nome, f.data_nascimento, f.observacoes]
            );
        }

        await client.query('COMMIT');
        res.json({ message: 'Membro atualizado com sucesso!' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Erro ao atualizar membro:', error);
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Deletar membro
app.delete('/api/membros/:id', verificarToken, async (req, res) => {
    const { id } = req.params;

    try {
        await pool.query('DELETE FROM membros WHERE id = $1', [id]);
        res.json({ message: 'Membro deletado com sucesso!' });
    } catch (error) {
        console.error('Erro ao deletar membro:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========== ESTATÍSTICAS (PROTEGIDAS) ==========

app.get('/api/dashboard', verificarToken, async (req, res) => {
    try {
        const totalMembros = await pool.query('SELECT COUNT(*) as total FROM membros WHERE tipo_participante = $1', ['Membro']);
        const totalCongregados = await pool.query('SELECT COUNT(*) as total FROM membros WHERE tipo_participante = $1', ['Congregado']);
        const totalGeral = await pool.query('SELECT COUNT(*) as total FROM membros');
        const porSexo = await pool.query('SELECT sexo, COUNT(*) as total FROM membros GROUP BY sexo');
        const porTipo = await pool.query('SELECT tipo_participante, COUNT(*) as total FROM membros GROUP BY tipo_participante');

        res.json({
            total_membros: parseInt(totalMembros.rows[0].total),
            total_congregados: parseInt(totalCongregados.rows[0].total),
            total_geral: parseInt(totalGeral.rows[0].total),
            por_sexo: porSexo.rows,
            por_tipo: porTipo.rows
        });
    } catch (error) {
        console.error('Erro ao buscar dashboard:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/aniversariantes', verificarToken, async (req, res) => {
    const { mes } = req.query;
    const mesAtual = mes || (new Date().getMonth() + 1);

    try {
        const result = await pool.query(
            `SELECT id, nome, conhecido_como, data_nascimento, telefone_principal, tipo_participante
             FROM membros
             WHERE EXTRACT(MONTH FROM data_nascimento) = $1
             ORDER BY EXTRACT(DAY FROM data_nascimento)`,
            [mesAtual]
        );

        res.json(result.rows);
    } catch (error) {
        console.error('Erro ao buscar aniversariantes:', error);
        res.status(500).json({ error: error.message });
    }
});

// Servir a aplicação web
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index-auth.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('Login padrão: admin@igreja.com / admin123');
    console.log('Banco de dados: Supabase (PostgreSQL)');
});
