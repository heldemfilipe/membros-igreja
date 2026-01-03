require("dotenv").config();
const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const XLSX = require("xlsx");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Configuração do PostgreSQL (Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Testar conexão
pool.connect((err, client, release) => {
  if (err) {
    console.error("Erro ao conectar ao banco de dados:", err.stack);
  } else {
    console.log("✓ Conectado ao Supabase (PostgreSQL)");
    release();
  }
});

// ========== MIDDLEWARE DE AUTENTICAÇÃO ==========
async function verificarToken(req, res, next) {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  const tokenLimpo = token.replace("Bearer ", "");

  try {
    const result = await pool.query(
      `SELECT s.*, u.id as user_id, u.nome, u.email, u.tipo, u.ativo
             FROM sessoes s
             JOIN usuarios u ON s.usuario_id = u.id
             WHERE s.token = $1 AND s.expira_em > NOW()`,
      [tokenLimpo]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Token inválido ou expirado" });
    }

    const sessao = result.rows[0];

    if (!sessao.ativo) {
      return res.status(403).json({ error: "Usuário inativo" });
    }

    req.usuario = {
      id: sessao.user_id,
      nome: sessao.nome,
      email: sessao.email,
      tipo: sessao.tipo,
    };

    next();
  } catch (error) {
    console.error("Erro na verificação do token:", error);
    res.status(500).json({ error: error.message });
  }
}

function verificarAdmin(req, res, next) {
  if (req.usuario.tipo !== "admin") {
    return res
      .status(403)
      .json({ error: "Acesso negado. Apenas administradores." });
  }
  next();
}

// ========== ROTAS DE AUTENTICAÇÃO ==========

// Login
app.post("/api/auth/login", async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ error: "Email e senha são obrigatórios" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM usuarios WHERE email = $1 AND ativo = TRUE",
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: "Email ou senha inválidos" });
    }

    const usuario = result.rows[0];
    const senhaValida = await bcrypt.compare(senha, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({ error: "Email ou senha inválidos" });
    }

    // Gerar token
    const token = uuidv4();
    const expiraEm = new Date();
    expiraEm.setHours(expiraEm.getHours() + 24);

    await pool.query(
      "INSERT INTO sessoes (usuario_id, token, expira_em) VALUES ($1, $2, $3)",
      [usuario.id, token, expiraEm]
    );

    // Atualizar último acesso
    await pool.query(
      "UPDATE usuarios SET ultimo_acesso = NOW() WHERE id = $1",
      [usuario.id]
    );

    res.json({
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        tipo: usuario.tipo,
      },
    });
  } catch (error) {
    console.error("Erro no login:", error);
    res.status(500).json({ error: error.message });
  }
});

// Logout
app.post("/api/auth/logout", verificarToken, async (req, res) => {
  const token = req.headers["authorization"].replace("Bearer ", "");

  try {
    await pool.query("DELETE FROM sessoes WHERE token = $1", [token]);
    res.json({ message: "Logout realizado com sucesso" });
  } catch (error) {
    console.error("Erro no logout:", error);
    res.status(500).json({ error: error.message });
  }
});

// Verificar sessão
app.get("/api/auth/verify", verificarToken, (req, res) => {
  res.json({ usuario: req.usuario });
});

// ========== ROTAS DE USUÁRIOS (ADMIN) ==========

// Listar usuários
app.get("/api/usuarios", verificarToken, verificarAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, nome, email, tipo, ativo, created_at, ultimo_acesso FROM usuarios ORDER BY nome"
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar usuários:", error);
    res.status(500).json({ error: error.message });
  }
});

// Criar usuário
app.post("/api/usuarios", verificarToken, verificarAdmin, async (req, res) => {
  const { nome, email, senha, tipo } = req.body;

  if (!nome || !email || !senha) {
    return res
      .status(400)
      .json({ error: "Nome, email e senha são obrigatórios" });
  }

  try {
    const senhaCriptografada = await bcrypt.hash(senha, 10);

    const result = await pool.query(
      "INSERT INTO usuarios (nome, email, senha, tipo) VALUES ($1, $2, $3, $4) RETURNING id",
      [nome, email, senhaCriptografada, tipo || "usuario"]
    );

    res.json({ id: result.rows[0].id, message: "Usuário criado com sucesso" });
  } catch (error) {
    if (error.code === "23505") {
      // Unique violation
      res.status(400).json({ error: "Email já cadastrado" });
    } else {
      console.error("Erro ao criar usuário:", error);
      res.status(500).json({ error: error.message });
    }
  }
});

// Atualizar usuário
app.put(
  "/api/usuarios/:id",
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    const { id } = req.params;
    const { nome, email, senha, tipo, ativo } = req.body;

    try {
      let query, params;

      if (senha) {
        const senhaCriptografada = await bcrypt.hash(senha, 10);
        query =
          "UPDATE usuarios SET nome = $1, email = $2, senha = $3, tipo = $4, ativo = $5 WHERE id = $6";
        params = [nome, email, senhaCriptografada, tipo, ativo, id];
      } else {
        query =
          "UPDATE usuarios SET nome = $1, email = $2, tipo = $3, ativo = $4 WHERE id = $5";
        params = [nome, email, tipo, ativo, id];
      }

      await pool.query(query, params);
      res.json({ message: "Usuário atualizado com sucesso" });
    } catch (error) {
      if (error.code === "23505") {
        res.status(400).json({ error: "Email já cadastrado" });
      } else {
        console.error("Erro ao atualizar usuário:", error);
        res.status(500).json({ error: error.message });
      }
    }
  }
);

// Deletar usuário
app.delete(
  "/api/usuarios/:id",
  verificarToken,
  verificarAdmin,
  async (req, res) => {
    const { id } = req.params;

    if (parseInt(id) === req.usuario.id) {
      return res
        .status(400)
        .json({ error: "Não é possível deletar seu próprio usuário" });
    }

    try {
      await pool.query("DELETE FROM usuarios WHERE id = $1", [id]);
      res.json({ message: "Usuário deletado com sucesso" });
    } catch (error) {
      console.error("Erro ao deletar usuário:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

// Alterar própria senha
app.post("/api/auth/trocar-senha", verificarToken, async (req, res) => {
  const { senhaAtual, novaSenha } = req.body;

  if (!senhaAtual || !novaSenha) {
    return res
      .status(400)
      .json({ error: "Senha atual e nova senha são obrigatórias" });
  }

  try {
    const result = await pool.query(
      "SELECT senha FROM usuarios WHERE id = $1",
      [req.usuario.id]
    );
    const usuario = result.rows[0];

    const senhaValida = await bcrypt.compare(senhaAtual, usuario.senha);

    if (!senhaValida) {
      return res.status(401).json({ error: "Senha atual incorreta" });
    }

    const senhaCriptografada = await bcrypt.hash(novaSenha, 10);
    await pool.query("UPDATE usuarios SET senha = $1 WHERE id = $2", [
      senhaCriptografada,
      req.usuario.id,
    ]);

    res.json({ message: "Senha alterada com sucesso" });
  } catch (error) {
    console.error("Erro ao trocar senha:", error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ROTAS DE MEMBROS (PROTEGIDAS) ==========

// Listar todos os membros
app.get("/api/membros", verificarToken, async (req, res) => {
  const { tipo, search, cargo } = req.query;

  try {
    let query = "SELECT * FROM membros WHERE 1=1";
    const params = [];
    let paramCount = 1;

    if (tipo) {
      query += ` AND tipo_participante = $${paramCount}`;
      params.push(tipo);
      paramCount++;
    }

    if (cargo) {
      query += ` AND cargo = $${paramCount}`;
      params.push(cargo);
      paramCount++;
    }

    if (search) {
      query += ` AND (nome ILIKE $${paramCount} OR conhecido_como ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    query += " ORDER BY nome";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao listar membros:", error);
    res.status(500).json({ error: error.message });
  }
});

// Buscar membro por ID
app.get("/api/membros/:id", verificarToken, async (req, res) => {
  const { id } = req.params;

  try {
    const membroResult = await pool.query(
      "SELECT * FROM membros WHERE id = $1",
      [id]
    );

    if (membroResult.rows.length === 0) {
      return res.status(404).json({ error: "Membro não encontrado" });
    }

    const historicosResult = await pool.query(
      "SELECT * FROM historicos WHERE membro_id = $1",
      [id]
    );
    const familiaresResult = await pool.query(
      "SELECT * FROM familiares WHERE membro_id = $1",
      [id]
    );

    res.json({
      ...membroResult.rows[0],
      historicos: historicosResult.rows,
      familiares: familiaresResult.rows,
    });
  } catch (error) {
    console.error("Erro ao buscar membro:", error);
    res.status(500).json({ error: error.message });
  }
});

// Criar novo membro
app.post("/api/membros", verificarToken, async (req, res) => {
  const {
    nome,
    conhecido_como,
    igreja,
    cargo,
    sexo,
    data_nascimento,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    telefone_principal,
    telefone_secundario,
    email,
    cpf,
    estado_civil,
    profissao,
    identidade,
    orgao_expedidor,
    data_expedicao,
    grau_instrucao,
    titulo_eleitor,
    titulo_eleitor_zona,
    titulo_eleitor_secao,
    tipo_sanguineo,
    cert_nascimento_casamento,
    reservista,
    carteira_motorista,
    chefe_familiar,
    data_casamento,
    naturalidade,
    uf_naturalidade,
    nacionalidade,
    origem_religiosa,
    tipo_participante,
    informacoes_complementares,
    historicos = [],
    familiares = [],
  } = req.body;

  // Função para converter strings vazias em null
  const toNull = (value) =>
    value === "" || value === undefined ? null : value;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

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
        nome,
        toNull(conhecido_como),
        toNull(igreja),
        toNull(cargo),
        toNull(sexo),
        toNull(data_nascimento),
        toNull(cep),
        toNull(logradouro),
        toNull(numero),
        toNull(complemento),
        toNull(bairro),
        toNull(cidade),
        toNull(estado),
        toNull(telefone_principal),
        toNull(telefone_secundario),
        toNull(email),
        toNull(cpf),
        toNull(estado_civil),
        toNull(profissao),
        toNull(identidade),
        toNull(orgao_expedidor),
        toNull(data_expedicao),
        toNull(grau_instrucao),
        toNull(titulo_eleitor),
        toNull(titulo_eleitor_zona),
        toNull(titulo_eleitor_secao),
        toNull(tipo_sanguineo),
        toNull(cert_nascimento_casamento),
        toNull(reservista),
        toNull(carteira_motorista),
        chefe_familiar || false,
        toNull(data_casamento),
        toNull(naturalidade),
        toNull(uf_naturalidade),
        toNull(nacionalidade),
        toNull(origem_religiosa),
        tipo_participante || "Membro",
        toNull(informacoes_complementares),
      ]
    );

    const membroId = membroResult.rows[0].id;

    // Inserir históricos
    for (const h of historicos) {
      await client.query(
        "INSERT INTO historicos (membro_id, tipo, data, localidade, observacoes) VALUES ($1, $2, $3, $4, $5)",
        [membroId, h.tipo, h.data, h.localidade, h.observacoes]
      );
    }

    // Inserir familiares
    for (const f of familiares) {
      await client.query(
        "INSERT INTO familiares (membro_id, parentesco, nome, data_nascimento, observacoes) VALUES ($1, $2, $3, $4, $5)",
        [membroId, f.parentesco, f.nome, f.data_nascimento, f.observacoes]
      );
    }

    await client.query("COMMIT");
    res.json({ id: membroId, message: "Membro cadastrado com sucesso!" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao criar membro:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Atualizar membro
app.put("/api/membros/:id", verificarToken, async (req, res) => {
  const { id } = req.params;
  const {
    nome,
    conhecido_como,
    igreja,
    cargo,
    sexo,
    data_nascimento,
    cep,
    logradouro,
    numero,
    complemento,
    bairro,
    cidade,
    estado,
    telefone_principal,
    telefone_secundario,
    email,
    cpf,
    estado_civil,
    profissao,
    identidade,
    orgao_expedidor,
    data_expedicao,
    grau_instrucao,
    titulo_eleitor,
    titulo_eleitor_zona,
    titulo_eleitor_secao,
    tipo_sanguineo,
    cert_nascimento_casamento,
    reservista,
    carteira_motorista,
    chefe_familiar,
    data_casamento,
    naturalidade,
    uf_naturalidade,
    nacionalidade,
    origem_religiosa,
    tipo_participante,
    informacoes_complementares,
    historicos = [],
    familiares = [],
  } = req.body;

  // Função para converter strings vazias em null
  const toNull = (value) =>
    value === "" || value === undefined ? null : value;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

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
        nome,
        toNull(conhecido_como),
        toNull(igreja),
        toNull(cargo),
        toNull(sexo),
        toNull(data_nascimento),
        toNull(cep),
        toNull(logradouro),
        toNull(numero),
        toNull(complemento),
        toNull(bairro),
        toNull(cidade),
        toNull(estado),
        toNull(telefone_principal),
        toNull(telefone_secundario),
        toNull(email),
        toNull(cpf),
        toNull(estado_civil),
        toNull(profissao),
        toNull(identidade),
        toNull(orgao_expedidor),
        toNull(data_expedicao),
        toNull(grau_instrucao),
        toNull(titulo_eleitor),
        toNull(titulo_eleitor_zona),
        toNull(titulo_eleitor_secao),
        toNull(tipo_sanguineo),
        toNull(cert_nascimento_casamento),
        toNull(reservista),
        toNull(carteira_motorista),
        chefe_familiar || false,
        toNull(data_casamento),
        toNull(naturalidade),
        toNull(uf_naturalidade),
        toNull(nacionalidade),
        toNull(origem_religiosa),
        tipo_participante,
        toNull(informacoes_complementares),
        id,
      ]
    );

    // Deletar históricos e familiares antigos
    await client.query("DELETE FROM historicos WHERE membro_id = $1", [id]);
    await client.query("DELETE FROM familiares WHERE membro_id = $1", [id]);

    // Inserir novos históricos
    for (const h of historicos) {
      await client.query(
        "INSERT INTO historicos (membro_id, tipo, data, localidade, observacoes) VALUES ($1, $2, $3, $4, $5)",
        [id, h.tipo, h.data, h.localidade, h.observacoes]
      );
    }

    // Inserir novos familiares
    for (const f of familiares) {
      await client.query(
        "INSERT INTO familiares (membro_id, parentesco, nome, data_nascimento, observacoes) VALUES ($1, $2, $3, $4, $5)",
        [id, f.parentesco, f.nome, f.data_nascimento, f.observacoes]
      );
    }

    await client.query("COMMIT");
    res.json({ message: "Membro atualizado com sucesso!" });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Erro ao atualizar membro:", error);
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

// Deletar membro
app.delete("/api/membros/:id", verificarToken, async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM membros WHERE id = $1", [id]);
    res.json({ message: "Membro deletado com sucesso!" });
  } catch (error) {
    console.error("Erro ao deletar membro:", error);
    res.status(500).json({ error: error.message });
  }
});

// ========== ESTATÍSTICAS (PROTEGIDAS) ==========

app.get("/api/dashboard", verificarToken, async (req, res) => {
  try {
    const totalMembros = await pool.query(
      "SELECT COUNT(*) as total FROM membros WHERE tipo_participante = $1",
      ["Membro"]
    );
    const totalCongregados = await pool.query(
      "SELECT COUNT(*) as total FROM membros WHERE tipo_participante = $1",
      ["Congregado"]
    );
    const totalGeral = await pool.query(
      "SELECT COUNT(*) as total FROM membros"
    );
    const porSexo = await pool.query(
      "SELECT sexo, COUNT(*) as total FROM membros WHERE sexo IS NOT NULL AND sexo != '' GROUP BY sexo ORDER BY total DESC"
    );
    const porTipo = await pool.query(
      "SELECT tipo_participante, COUNT(*) as total FROM membros GROUP BY tipo_participante ORDER BY total DESC"
    );
    const porCargo = await pool.query(
      "SELECT cargo, COUNT(*) as total FROM membros WHERE cargo IS NOT NULL AND cargo != '' GROUP BY cargo ORDER BY total DESC"
    );

    // Gráfico por Faixa Etária
    const porFaixaEtaria = await pool.query(`
    SELECT faixa, COUNT(*) AS total
    FROM (
        SELECT
            CASE
                WHEN EXTRACT(YEAR FROM AGE(data_nascimento)) < 18 THEN '0-17 anos'
                WHEN EXTRACT(YEAR FROM AGE(data_nascimento)) BETWEEN 18 AND 25 THEN '18-25 anos'
                WHEN EXTRACT(YEAR FROM AGE(data_nascimento)) BETWEEN 26 AND 35 THEN '26-35 anos'
                WHEN EXTRACT(YEAR FROM AGE(data_nascimento)) BETWEEN 36 AND 45 THEN '36-45 anos'
                WHEN EXTRACT(YEAR FROM AGE(data_nascimento)) BETWEEN 46 AND 60 THEN '46-60 anos'
                WHEN EXTRACT(YEAR FROM AGE(data_nascimento)) > 60 THEN 'Acima de 60 anos'
                ELSE 'Não informado'
            END AS faixa
        FROM membros
        WHERE data_nascimento IS NOT NULL
    ) t
    GROUP BY faixa
    ORDER BY
        CASE faixa
            WHEN '0-17 anos' THEN 1
            WHEN '18-25 anos' THEN 2
            WHEN '26-35 anos' THEN 3
            WHEN '36-45 anos' THEN 4
            WHEN '46-60 anos' THEN 5
            WHEN 'Acima de 60 anos' THEN 6
            ELSE 7
        END
`);

    // Estatísticas de Idade
    const estatisticasIdade = await pool.query(`
            SELECT
                ROUND(AVG(EXTRACT(YEAR FROM AGE(data_nascimento)))) as idade_media,
                COUNT(*) as total_com_idade
            FROM membros
            WHERE data_nascimento IS NOT NULL
        `);

    res.json({
      total_membros: parseInt(totalMembros.rows[0].total),
      total_congregados: parseInt(totalCongregados.rows[0].total),
      total_geral: parseInt(totalGeral.rows[0].total),
      por_sexo: porSexo.rows,
      por_tipo: porTipo.rows,
      por_cargo: porCargo.rows,
      por_faixa_etaria: porFaixaEtaria.rows,
      estatisticas_idade: {
        idade_media: parseInt(estatisticasIdade.rows[0].idade_media) || 0,
        total_com_idade:
          parseInt(estatisticasIdade.rows[0].total_com_idade) || 0,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar dashboard:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/aniversariantes", verificarToken, async (req, res) => {
  const { mes } = req.query;
  const mesAtual = mes || new Date().getMonth() + 1;

  try {
    const result = await pool.query(
      `SELECT id, nome, conhecido_como, data_nascimento, telefone_principal, tipo_participante, cargo
             FROM membros
             WHERE EXTRACT(MONTH FROM data_nascimento) = $1
             ORDER BY EXTRACT(DAY FROM data_nascimento)`,
      [mesAtual]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Erro ao buscar aniversariantes:", error);
    res.status(500).json({ error: error.message });
  }
});

// ========== EXPORTAR PLANILHA ==========
app.get("/api/membros/exportar", validarSessao, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        nome,
        conhecido_como,
        sexo,
        data_nascimento,
        telefone_principal,
        telefone_secundario,
        email,
        endereco_rua,
        endereco_numero,
        endereco_complemento,
        endereco_bairro,
        endereco_cidade,
        endereco_estado,
        endereco_cep,
        tipo_participante,
        cargo,
        data_batismo,
        igreja_origem,
        observacoes,
        created_at
      FROM membros
      ORDER BY nome`
    );

    // Formatar dados para Excel
    const dados = result.rows.map((membro) => ({
      Nome: membro.nome || "",
      "Conhecido Como": membro.conhecido_como || "",
      Sexo: membro.sexo || "",
      "Data de Nascimento": membro.data_nascimento
        ? new Date(membro.data_nascimento).toLocaleDateString("pt-BR")
        : "",
      "Telefone Principal": membro.telefone_principal || "",
      "Telefone Secundário": membro.telefone_secundario || "",
      Email: membro.email || "",
      Rua: membro.endereco_rua || "",
      Número: membro.endereco_numero || "",
      Complemento: membro.endereco_complemento || "",
      Bairro: membro.endereco_bairro || "",
      Cidade: membro.endereco_cidade || "",
      Estado: membro.endereco_estado || "",
      CEP: membro.endereco_cep || "",
      Tipo: membro.tipo_participante || "",
      Cargo: membro.cargo || "",
      "Data de Batismo": membro.data_batismo
        ? new Date(membro.data_batismo).toLocaleDateString("pt-BR")
        : "",
      "Igreja de Origem": membro.igreja_origem || "",
      Observações: membro.observacoes || "",
      "Data de Cadastro": membro.created_at
        ? new Date(membro.created_at).toLocaleDateString("pt-BR")
        : "",
    }));

    // Criar workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(dados);

    // Ajustar largura das colunas
    const colWidths = [
      { wch: 30 }, // Nome
      { wch: 20 }, // Conhecido Como
      { wch: 10 }, // Sexo
      { wch: 15 }, // Data Nascimento
      { wch: 15 }, // Telefone Principal
      { wch: 15 }, // Telefone Secundário
      { wch: 30 }, // Email
      { wch: 30 }, // Rua
      { wch: 8 }, // Número
      { wch: 15 }, // Complemento
      { wch: 20 }, // Bairro
      { wch: 20 }, // Cidade
      { wch: 5 }, // Estado
      { wch: 10 }, // CEP
      { wch: 12 }, // Tipo
      { wch: 15 }, // Cargo
      { wch: 15 }, // Data Batismo
      { wch: 30 }, // Igreja Origem
      { wch: 40 }, // Observações
      { wch: 15 }, // Data Cadastro
    ];
    ws["!cols"] = colWidths;

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(wb, ws, "Membros");

    // Gerar buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Enviar arquivo
    const dataAtual = new Date().toISOString().split("T")[0];
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="membros_${dataAtual}.xlsx"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(buffer);
  } catch (error) {
    console.error("Erro ao exportar planilha:", error);
    res.status(500).json({ error: error.message });
  }
});

// Servir a aplicação web
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index-auth.html"));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log("Login padrão: admin@igreja.com / admin123");
  console.log("Banco de dados: Supabase (PostgreSQL)");
});
