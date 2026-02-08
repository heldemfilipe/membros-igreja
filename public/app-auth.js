const API_URL = window.location.origin.includes("localhost") 
  ? "http://localhost:3000/api" 
  : "/api";

// Estado global
let currentPage = "dashboard";
let editingMemberId = null;
let editingUsuarioId = null;
let currentUser = null;
let authToken = null;
let membroAtualModal = null; // Armazena dados para o modal de visualização

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  verificarAutenticacao();
});

// ========== AUTENTICAÇÃO ==========
async function verificarAutenticacao() {
  authToken = localStorage.getItem("token");
  const usuarioStr = localStorage.getItem("usuario");

  if (!authToken || !usuarioStr) {
    window.location.href = "login.html";
    return;
  }

  try {
    const response = await fetch(`${API_URL}/auth/verify`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!response.ok) {
      throw new Error("Token inválido");
    }

    const data = await response.json();
    currentUser = data.usuario;

    document.getElementById("user-name").textContent = currentUser.nome;

    // Mostrar menu de usuários apenas para admin
    if (currentUser.tipo === "admin") {
      document.querySelectorAll(".admin-only").forEach((el) => {
        el.style.display = "";
      });
    }

    initApp();
  } catch (error) {
    console.error("Erro na autenticação:", error);
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "login.html";
  }
}

async function logout() {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${authToken}` },
    });
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
  } finally {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "login.html";
  }
}

// Função auxiliar para requisições autenticadas
async function fetchAuth(url, options = {}) {
  const headers = {
    Authorization: `Bearer ${authToken}`,
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "login.html";
    throw new Error("Não autorizado");
  }

  return response;
}

// ========== BUSCA CEP (Formulário Principal) ==========
async function buscarCEP() {
  const cepInput = document.getElementById("cep");
  const cep = cepInput.value.replace(/\D/g, ""); // Remove caracteres não numéricos

  if (cep.length !== 8) {
    return;
  }

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();

    if (data.erro) {
      alert("CEP não encontrado");
      return;
    }

    // Preencher campos automaticamente
    document.getElementById("logradouro").value = data.logradouro || "";
    document.getElementById("bairro").value = data.bairro || "";
    document.getElementById("cidade").value = data.localidade || "";
    document.getElementById("estado").value = data.uf || "";

    // Focar no campo número
    document.getElementById("numero").focus();
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    alert("Erro ao buscar CEP. Tente novamente.");
  }
}

// ========== INICIALIZAÇÃO DO APP ==========
function initApp() {
  initNavigation();
  initFilters();
  loadDashboard();

  const mesAtual = new Date().getMonth() + 1;
  document.getElementById("mes-filter").value = mesAtual;

  document
    .getElementById("membro-form")
    .addEventListener("submit", handleFormSubmit);
  document
    .getElementById("usuario-form")
    .addEventListener("submit", handleUsuarioFormSubmit);
  document
    .getElementById("departamento-form")
    .addEventListener("submit", handleDepartamentoFormSubmit);
  document
    .getElementById("visitante-form")
    .addEventListener("submit", handleVisitanteFormSubmit);

  // Carregar departamentos no filtro e no cadastro
  carregarFiltrodepartamentos();
  carregarSelectDepartamentoCadastro();

  // Mostrar/esconder cargo departamento quando selecionar departamento
  document.getElementById("cadastro-departamento").addEventListener("change", function () {
    document.getElementById("cargo-dept-group").style.display = this.value ? "" : "none";
    if (!this.value) document.getElementById("cadastro-cargo-departamento").value = "";
  });
}

// ========== NAVEGAÇÃO ==========
function initNavigation() {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;
      navigateTo(page);
    });
  });
}

function navigateTo(page) {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.page === page);
  });

  document.querySelectorAll(".page").forEach((p) => {
    p.classList.toggle("active", p.id === `${page}-page`);
  });

  currentPage = page;

  switch (page) {
    case "dashboard":
      loadDashboard();
      break;
    case "aniversariantes":
      loadAniversariantes();
      break;
    case "membros":
      loadMembros();
      break;
    case "cadastro":
      // Se não estiver editando um membro específico ao clicar na aba, reseta o form
      if (!editingMemberId) {
        resetForm();
      }
      break;
    case "departamentos":
      loadDepartamentos();
      break;
    case "usuarios":
      if (currentUser.tipo === "admin") {
        loadUsuarios();
      }
      break;
  }
}

// ========== DASHBOARD ==========
async function loadDashboard() {
  try {
    const response = await fetchAuth(`${API_URL}/dashboard`);
    const data = await response.json();

    document.getElementById("total-membros").textContent =
      data.total_membros || 0;
    document.getElementById("total-congregados").textContent =
      data.total_congregados || 0;
    document.getElementById("total-geral").textContent = data.total_geral || 0;

    // Função auxiliar para criar gráfico de pizza
    const criarGraficoPizza = (containerId, dados, labelKey, valueKey) => {
      const container = document.getElementById(containerId);
      container.innerHTML = "";

      if (!dados || dados.length === 0) {
        container.innerHTML =
          '<div class="empty-state"><p>Nenhum dado disponível</p></div>';
        return;
      }

      // Calcular total
      const total = dados.reduce(
        (sum, item) => sum + parseInt(item[valueKey] || 0),
        0
      );

      if (total === 0) {
        container.innerHTML =
          '<div class="empty-state"><p>Nenhum dado disponível</p></div>';
        return;
      }

      // Debug: mostrar dados no console
      console.log("Gráfico:", containerId, "Total:", total, "Dados:", dados);

      // Função auxiliar para obter a cor correta baseada no tipo de gráfico
      const getCor = (label, idx) => {
        if (labelKey === "cargo") return getCorCargo(label);
        if (labelKey === "sexo") return getCorSexo(label);
        if (labelKey === "tipo_participante") return getCorTipo(label);
        if (labelKey === "faixa") return getCorFaixaEtaria(label);
        if (labelKey === "departamento") return getCorDepartamento(label, idx);
        return "#95a5a6";
      };

      // Criar gráfico de pizza usando conic-gradient
      let anguloAtual = 0;
      const gradientParts = [];

      dados.forEach((item, idx) => {
        const valor = parseInt(item[valueKey] || 0);
        const angulo = (valor / total) * 360;
        const cor = getCor(item[labelKey], idx);

        const anguloInicio = anguloAtual;
        const anguloFim = anguloAtual + angulo;

        gradientParts.push(`${cor} ${anguloInicio}deg ${anguloFim}deg`);
        anguloAtual = anguloFim;
      });

      // Criar HTML do gráfico
      container.innerHTML = `
        <div class="chart-bars">
          <div class="chart-legend">
            ${dados
              .map((item, idx) => {
                const valor = parseInt(item[valueKey] || 0);
                const porcentagem = ((valor / total) * 100).toFixed(1);
                const cor = getCor(item[labelKey], idx);
                return `
                <div class="legend-item">
                  <div class="legend-label">
                    <div class="legend-color" style="background-color: ${cor}"></div>
                    ${item[labelKey] || "N/A"}
                  </div>
                  <div class="legend-value">
                    <span class="legend-percentage">${porcentagem}%</span>
                    <span class="legend-count">(${valor})</span>
                  </div>
                </div>
              `;
              })
              .join("")}
          </div>
          <div class="chart-pie-container">
            <div class="chart-pie" style="background: conic-gradient(${gradientParts.join(
              ", "
            )})"></div>
          </div>
        </div>
      `;
    };

    criarGraficoPizza("chart-sexo", data.por_sexo, "sexo", "total");
    criarGraficoPizza(
      "chart-tipo",
      data.por_tipo,
      "tipo_participante",
      "total"
    );
    criarGraficoPizza("chart-cargo", data.por_cargo, "cargo", "total");
    criarGraficoPizza("chart-faixa-etaria", data.por_faixa_etaria, "faixa", "total");
    criarGraficoPizza("chart-departamento", data.por_departamento, "departamento", "total");

    const chartIdade = document.getElementById("chart-idade");
    chartIdade.innerHTML = "";
    if (data.estatisticas_idade) {
      chartIdade.innerHTML = `
                <div class="stat-box">
                    <div class="stat-box-label">Idade Média</div>
                    <div class="stat-box-value">${
                      data.estatisticas_idade.idade_media || 0
                    } anos</div>
                    <div class="stat-box-subtitle">Média geral dos membros</div>
                </div>
                <div class="stat-box">
                    <div class="stat-box-label">Total com Idade Registrada</div>
                    <div class="stat-box-value">${
                      data.estatisticas_idade.total_com_idade || 0
                    }</div>
                    <div class="stat-box-subtitle">Membros com data de nascimento</div>
                </div>
            `;
    } else {
      chartIdade.innerHTML =
        '<div class="empty-state"><p>Nenhum dado disponível</p></div>';
    }

    // Carregar aniversariantes do mês atual no dashboard
    await loadAniversariantesDashboard();
  } catch (error) {
    console.error("Erro ao carregar dashboard:", error);
    // alert("Erro ao carregar dados do dashboard"); // Opcional: comentar para não spammar alertas
  }
}

// Carregar aniversariantes para o dashboard (semana atual + anterior)
async function loadAniversariantesDashboard() {
  const mesAtual = new Date().getMonth() + 1;
  const container = document.getElementById("dashboard-aniversariantes");

  try {
    const response = await fetchAuth(
      `${API_URL}/aniversariantes?mes=${mesAtual}`
    );
    let allData = await response.json();

    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const mesHoje = hoje.getMonth();
    const anoHoje = hoje.getFullYear();

    // Se estiver nos primeiros 7 dias do mes, buscar mes anterior tambem
    if (diaHoje <= 7) {
      const mesPrevio = mesAtual === 1 ? 12 : mesAtual - 1;
      const responsePrev = await fetchAuth(
        `${API_URL}/aniversariantes?mes=${mesPrevio}`
      );
      const dataPrev = await responsePrev.json();
      allData = [...allData, ...dataPrev];
    }

    // Calcular inicio e fim da semana (Domingo a Sabado)
    const diaSemana = hoje.getDay(); // 0 = Domingo, 6 = Sabado
    const inicioSemanaAnterior = new Date(anoHoje, mesHoje, diaHoje - diaSemana - 7);
    const fimSemana = new Date(anoHoje, mesHoje, diaHoje + (6 - diaSemana));

    const aniversariantesSemana = allData.filter((item) => {
      if (!item.data_nascimento) return false;

      const partes = item.data_nascimento.split("-");
      if (partes.length !== 3) return false;

      const diaNasc = parseInt(partes[2]);
      const mesNasc = parseInt(partes[1]) - 1;

      // Criar data de aniversario no ano atual
      const aniversarioAno = new Date(anoHoje, mesNasc, diaNasc);

      // Verificar se esta entre inicio da semana anterior e fim da semana atual
      return aniversarioAno >= inicioSemanaAnterior && aniversarioAno <= fimSemana;
    });

    if (aniversariantesSemana.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><p>Nenhum aniversariante esta semana</p></div>';
      return;
    }

    container.innerHTML = "";
    aniversariantesSemana.forEach((item) => {
      // Calcular idade
      let idade = "N/A";
      if (item.data_nascimento) {
        try {
          const partes = item.data_nascimento.split("-");
          if (partes.length === 3) {
            const ano = parseInt(partes[0]);
            const mesNasc = parseInt(partes[1]) - 1;
            const dia = parseInt(partes[2]);
            const dataNasc = new Date(ano, mesNasc, dia);
            const hoje = new Date();
            idade = hoje.getFullYear() - dataNasc.getFullYear();
            const m = hoje.getMonth() - dataNasc.getMonth();
            if (m < 0 || (m === 0 && hoje.getDate() < dataNasc.getDate())) {
              idade--;
            }
          }
        } catch (e) {
          idade = "N/A";
        }
      }

      let dia = "?";

      if (item.data_nascimento) {
        const dataLimpa = item.data_nascimento.split("T")[0];
        const partes = dataLimpa.split("-");
        if (partes.length === 3) {
          dia = partes[2].padStart(2, "0");
        }
      }

      const cor = getCorCargo(item.cargo || "Membro");
      container.innerHTML += `
                <div class="list-item">
                    <div class="list-item-header">
                        <span class="list-item-title">${item.nome}</span>
                        <span class="list-item-badge">${dia}</span>
                      </div>
                    <div class="list-item-info">
                        Idade: ${idade} anos | Cargo: ${item.cargo}
                    </div>
                </div>
            `;
    });
  } catch (error) {
    console.error("Erro ao carregar aniversariantes do dashboard:", error);
    container.innerHTML =
      '<div class="empty-state"><p>Erro ao carregar dados</p></div>';
  }
}

// ========== FUNÇÕES AUXILIARES ==========
// Função para obter cor do cargo
function getCorCargo(cargo) {
  const cores = {
    Membro: "#8f5a1e",
    Cooperador: "#8d8400",
    Diácono: "#38a038",
    Presbítero: "#1881a1",
    Evangelista: "#162786",
    Pastor: "#8b3026",
    Outros: "#aa6d45",
  };
  return cores[cargo] || "#8f5a1e";
}

// Função para obter cor do sexo
function getCorSexo(sexo) {
  const cores = {
    Homem: "#4a90e2",
    Mulher: "#e91e63",
    Masculino: "#4a90e2",
    Feminino: "#e91e63",
  };
  return cores[sexo] || "#95a5a6";
}

// Função para obter cor do tipo
function getCorTipo(tipo) {
  const cores = {
    Membro: "#852d22ff",
    Congregado: "#51990eff",
    Visitante: "#9ea354ff",
  };
  return cores[tipo] || "#939a9bff";
}

// Função para obter cor da faixa etária
function getCorFaixaEtaria(faixa) {
  const cores = {
    "0-17 anos": "#e74c3c",
    "18-25 anos": "#e67e22",
    "26-35 anos": "#f1c40f",
    "36-45 anos": "#2ecc71",
    "46-60 anos": "#3498db",
    "Acima de 60 anos": "#9b59b6",
    "Não informado": "#95a5a6",
  };
  return cores[faixa] || "#95a5a6";
}

// Função para obter cor do departamento
function getCorDepartamento(dept, index) {
  const cores = [
    "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6",
    "#1abc9c", "#e67e22", "#34495e", "#16a085", "#c0392b",
    "#2980b9", "#8e44ad", "#27ae60", "#d35400",
  ];
  if (dept === "Sem Departamento") return "#7f8c8d";
  return cores[index % cores.length];
}

// ========== ANIVERSARIANTES ==========
function initFilters() {
  document
    .getElementById("mes-filter")
    .addEventListener("change", loadAniversariantes);
  document
    .getElementById("search-input")
    .addEventListener("input", debounce(loadMembros, 500));
  document
    .getElementById("tipo-filter")
    .addEventListener("change", loadMembros);
  document
    .getElementById("cargo-filter")
    .addEventListener("change", loadMembros);
  document
    .getElementById("departamento-filter")
    .addEventListener("change", loadMembros);
}

async function loadAniversariantes() {
  const mes = document.getElementById("mes-filter").value;
  const container = document.getElementById("aniversariantes-list");
  container.innerHTML = '<div class="loading">Carregando</div>';

  try {
    const response = await fetchAuth(`${API_URL}/aniversariantes?mes=${mes}`);
    const data = await response.json();
    if (data.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎂</div>
                    <p>Nenhum aniversariante neste mês</p>
                </div>
            `;
      return;
    }

    container.innerHTML = "";
    data.forEach((item) => {
      const idade = calcularIdade(item.data_nascimento);
      let dia = "?";

      if (item.data_nascimento) {
        const dataLimpa = item.data_nascimento.split("T")[0];
        const partes = dataLimpa.split("-");
        if (partes.length === 3) {
          dia = partes[2].padStart(2, "0");
        }
      }

      let infoHTML = "";
      if (currentUser.tipo === "admin") {
        infoHTML = `
                    ${
                      item.conhecido_como
                        ? `Conhecido como: ${item.conhecido_como} | `
                        : ""
                    }
                    Idade: ${idade} anos |
                    Cargo: ${item.cargo || "N/A"} |
                    Tipo: ${item.tipo_participante}
                    ${
                      item.telefone_principal
                        ? ` | Tel: ${item.telefone_principal}`
                        : ""
                    }
                `;
      } else {
        infoHTML = `
                    Idade: ${idade} anos |
                    Cargo: ${item.cargo || "N/A"}
                `;
      }

      const cor = getCorCargo(item.cargo || "Membro");
      container.innerHTML += `
                <div class="list-item">
                    <div class="list-item-header">
                        <span class="list-item-title">${item.nome}</span>
                        <span class="list-item-badge">${dia}</span>
                    </div>
                    <div class="list-item-info">
                        ${infoHTML}
                    </div>
                </div>
            `;
    });
  } catch (error) {
    console.error("Erro ao carregar aniversariantes:", error);
    container.innerHTML =
      '<div class="empty-state"><p>Erro ao carregar dados</p></div>';
  }
}

// ========== LISTA DE MEMBROS ==========
async function loadMembros() {
  const search = document.getElementById("search-input").value;
  const tipo = document.getElementById("tipo-filter").value;
  const cargo = document.getElementById("cargo-filter").value;
  const departamento = document.getElementById("departamento-filter").value;
  const container = document.getElementById("membros-list");
  container.innerHTML = '<div class="loading">Carregando</div>';

  try {
    let url = `${API_URL}/membros?`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (tipo) url += `tipo=${encodeURIComponent(tipo)}&`;
    if (cargo) url += `cargo=${encodeURIComponent(cargo)}&`;
    if (departamento) url += `departamento=${encodeURIComponent(departamento)}`;

    const response = await fetchAuth(url);
    const data = await response.json();

    if (data.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <p>Nenhum membro encontrado</p>
                </div>
            `;
      return;
    }

    container.innerHTML = "";
    data.forEach((item) => {
      const idade = calcularIdade(item.data_nascimento);
      let infoHTML = "";
      if (currentUser.tipo === "admin") {
        infoHTML = `
                    ${
                      item.conhecido_como
                        ? `Conhecido como: ${item.conhecido_como} | `
                        : ""
                    }
                    ${item.sexo ? `${item.sexo} | ` : ""}
                    Idade: ${idade} anos
                    ${
                      item.telefone_principal
                        ? ` | Tel: ${item.telefone_principal}`
                        : ""
                    }
                    ${item.cargo ? ` | Cargo: ${item.cargo}` : ""}
                    | Tipo: ${item.tipo_participante}
                `;
      } else {
        infoHTML = `
                    Idade: ${idade} anos
                    ${item.cargo ? ` | Cargo: ${item.cargo}` : ""}
                `;
      }

      const cor = getCorCargo(item.cargo || "Membro");
      // Montar badges de departamento com cargo
      let deptBadgesHTML = "";
      if (item.departamentos_info && item.departamentos_info.length > 0) {
        deptBadgesHTML = item.departamentos_info.map((d) => {
          const label = d.cargo_departamento ? `${d.dept_nome} (${d.cargo_departamento})` : d.dept_nome;
          return `<span class="list-item-badge" style="background-color: #8e44ad; font-size: 0.75em;">${label}</span>`;
        }).join(" ");
      }

      container.innerHTML += `
                <div class="list-item">
                    <div class="list-item-header">
                        <span class="list-item-title">${item.nome}</span>
                        <div style="display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
                            <span class="list-item-badge" style="background-color: ${cor}">${
        item.cargo || "Membro"
      }</span>
                            ${deptBadgesHTML}
                        </div>
                    </div>
                    <div class="list-item-info">
                        ${infoHTML}
                    </div>
                    <div class="list-item-actions">
                        <button class="btn-small btn-edit" onclick="editMembro(${
                          item.id
                        })">Visualizar</button>
                        ${
                          currentUser.tipo === "admin"
                            ? `<button class="btn-small btn-delete" onclick="deleteMembro(${item.id}, '${item.nome}')">Excluir</button>`
                            : ""
                        }
                    </div>
                </div>
            `;
    });
  } catch (error) {
    console.error("Erro ao carregar membros:", error);
    container.innerHTML =
      '<div class="empty-state"><p>Erro ao carregar dados</p></div>';
  }
}

// ========== FORMULÁRIO DE MEMBROS (Cadastro/Edição) ==========
async function handleFormSubmit(e) {
  e.preventDefault();

  const formData = {
    nome: document.getElementById("nome").value,
    conhecido_como: document.getElementById("conhecido_como").value,
    igreja: document.getElementById("igreja").value,
    cargo: document.getElementById("cargo").value,
    sexo: document.getElementById("sexo").value,
    data_nascimento: document.getElementById("data_nascimento").value,
    cep: document.getElementById("cep").value,
    logradouro: document.getElementById("logradouro").value,
    numero: document.getElementById("numero").value,
    complemento: document.getElementById("complemento").value,
    bairro: document.getElementById("bairro").value,
    cidade: document.getElementById("cidade").value,
    estado: document.getElementById("estado").value,
    telefone_principal: document.getElementById("telefone_principal").value,
    telefone_secundario: document.getElementById("telefone_secundario").value,
    email: document.getElementById("email").value,
    cpf: document.getElementById("cpf").value,
    estado_civil: document.getElementById("estado_civil").value,
    profissao: document.getElementById("profissao").value,
    identidade: document.getElementById("identidade").value,
    orgao_expedidor: document.getElementById("orgao_expedidor").value,
    data_expedicao: document.getElementById("data_expedicao").value,
    grau_instrucao: document.getElementById("grau_instrucao").value,
    titulo_eleitor: document.getElementById("titulo_eleitor").value,
    titulo_eleitor_zona: document.getElementById("titulo_eleitor_zona").value,
    titulo_eleitor_secao: document.getElementById("titulo_eleitor_secao").value,
    tipo_sanguineo: document.getElementById("tipo_sanguineo").value,
    cert_nascimento_casamento: document.getElementById(
      "cert_nascimento_casamento"
    ).value,
    reservista: document.getElementById("reservista").value,
    carteira_motorista: document.getElementById("carteira_motorista").value,
    chefe_familiar: document.getElementById("chefe_familiar").checked,
    data_casamento: document.getElementById("data_casamento").value,
    naturalidade: document.getElementById("naturalidade").value,
    uf_naturalidade: document.getElementById("uf_naturalidade").value,
    nacionalidade: document.getElementById("nacionalidade").value,
    origem_religiosa: document.getElementById("origem_religiosa").value,
    tipo_participante: document.getElementById("tipo_participante").value,
    informacoes_complementares: document.getElementById(
      "informacoes_complementares"
    ).value,
    historicos: collectHistoricos(),
    familiares: collectFamiliares(),
  };

  try {
    let response;
    if (editingMemberId) {
      response = await fetchAuth(`${API_URL}/membros/${editingMemberId}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
    } else {
      response = await fetchAuth(`${API_URL}/membros`, {
        method: "POST",
        body: JSON.stringify(formData),
      });
    }

    const result = await response.json();

    if (response.ok) {
      // Salvar departamento se selecionado
      const deptId = document.getElementById("cadastro-departamento").value;
      const cargoDept = document.getElementById("cadastro-cargo-departamento").value;
      const membroIdSalvo = editingMemberId || result.id;

      if (deptId && membroIdSalvo) {
        try {
          // Se editando, primeiro remover departamentos antigos
          if (editingMemberId) {
            const depsAtuais = await fetchAuth(`${API_URL}/membros/${membroIdSalvo}/departamentos`);
            const depsData = await depsAtuais.json();
            if (Array.isArray(depsData)) {
              for (const d of depsData) {
                await fetchAuth(`${API_URL}/departamentos/${d.id}/membros/${membroIdSalvo}`, { method: "DELETE" });
              }
            }
          }
          await fetchAuth(`${API_URL}/departamentos/${deptId}/membros`, {
            method: "POST",
            body: JSON.stringify({ membro_id: parseInt(membroIdSalvo), cargo_departamento: cargoDept || null }),
          });
        } catch (e) {
          console.log("Erro ao vincular departamento:", e);
        }
      } else if (!deptId && editingMemberId) {
        // Se nenhum departamento selecionado e editando, remover vinculos
        try {
          const depsAtuais = await fetchAuth(`${API_URL}/membros/${membroIdSalvo}/departamentos`);
          const depsData = await depsAtuais.json();
          if (Array.isArray(depsData)) {
            for (const d of depsData) {
              await fetchAuth(`${API_URL}/departamentos/${d.id}/membros/${membroIdSalvo}`, { method: "DELETE" });
            }
          }
        } catch (e) {
          console.log("Erro ao remover departamentos:", e);
        }
      }

      alert(
        editingMemberId
          ? "Membro atualizado com sucesso!"
          : "Membro cadastrado com sucesso!"
      );
      resetForm();
      navigateTo("membros");
    } else {
      alert("Erro ao salvar: " + result.error);
    }
  } catch (error) {
    console.error("Erro ao salvar membro:", error);
    alert("Erro ao salvar membro");
  }
}

function collectHistoricos() {
  const historicos = [];
  document.querySelectorAll(".historico-item").forEach((item) => {
    const tipo = item.querySelector(".historico-tipo").value;
    const data = item.querySelector(".historico-data").value;
    const localidade = item.querySelector(".historico-localidade").value;

    if (tipo && data) {
      historicos.push({ tipo, data, localidade });
    }
  });
  return historicos;
}

function collectFamiliares() {
  const familiares = [];
  document.querySelectorAll(".familiar-item").forEach((item) => {
    const parentesco = item.querySelector(".familiar-parentesco").value;
    const nome = item.querySelector(".familiar-nome").value;
    const data_nascimento = item.querySelector(".familiar-data").value;

    if (parentesco && nome) {
      familiares.push({ parentesco, nome, data_nascimento });
    }
  });
  return familiares;
}

// ========== MODAL VISUALIZAR MEMBRO ==========
async function editMembro(id) {
  try {
    const response = await fetchAuth(`${API_URL}/membros/${id}`);
    const membro = await response.json();

    editingMemberId = id;
    abrirModalVisualizarMembro(membro);
  } catch (error) {
    console.error("Erro ao carregar membro:", error);
    alert("Erro ao carregar dados do membro");
  }
}

// ========== FUNÇÃO DE CARREGAMENTO CORRIGIDA ==========
async function editMembro(id) {
  try {
    const response = await fetchAuth(`${API_URL}/membros/${id}`);
    if (!response.ok)
      throw new Error("Não foi possível obter os dados do membro.");

    const membro = await response.json();
    editingMemberId = id;

    // Garante que históricos e familiares sejam arrays para evitar erros no .map()
    membro.historicos = membro.historicos || [];
    membro.familiares = membro.familiares || [];

    abrirModalVisualizarMembro(membro);
  } catch (error) {
    console.error("Erro ao carregar membro:", error);
    alert("Erro ao carregar dados do membro: " + error.message);
  }
}

// ========== MODAL DE VISUALIZAÇÃO COM VERIFICAÇÃO DE ELEMENTOS ==========
function abrirModalVisualizarMembro(membro) {
  membroAtualModal = membro;

  // Captura dos elementos do DOM
  const modal = document.getElementById("modal-visualizar-membro");
  const titulo = document.getElementById("modal-membro-titulo");
  const viewMode = document.getElementById("modal-view-mode");
  const editMode = document.getElementById("modal-edit-mode");
  const btnEditar = document.getElementById("btn-editar-modal");
  const btnSalvar = document.getElementById("btn-salvar-modal");
  const btnCancelar = document.getElementById("btn-cancelar-modal");
  const btnFechar = document.getElementById("btn-fechar-modal");

  // Verificação de segurança
  if (!modal || !viewMode) {
    console.error("Erro: Elementos do modal não encontrados no HTML.");
    return;
  }

  // Reset de visualização inicial
  if (titulo) titulo.textContent = membro.nome || "Detalhes do Membro";
  viewMode.style.display = "block";
  if (editMode) editMode.style.display = "none";
  if (btnSalvar) btnSalvar.style.display = "none";
  if (btnCancelar) btnCancelar.style.display = "none";
  if (btnFechar) btnFechar.style.display = "";

  // Lógica do Botão Editar (Apenas para Admin)
  if (btnEditar) {
    if (currentUser && currentUser.tipo === "admin") {
      btnEditar.style.display = "";
      btnEditar.onclick = () => {
        fecharModalVisualizarMembro(); // Fecha o modal de visualização
        carregarDadosParaEdicao(membro.id); // Função que preenche o form principal e muda de aba
      };
    } else {
      btnEditar.style.display = "none";
    }
  }

  // Funções auxiliares de formatação
  const formatarDataBR = (data) => {
    if (!data || data === "0000-00-00") return "N/A";
    try {
      const dataLimpa = data.includes("T") ? data.split("T")[0] : data;
      const partes = dataLimpa.split("-");
      return partes.length === 3
        ? `${partes[2]}/${partes[1]}/${partes[0]}`
        : "N/A";
    } catch (e) {
      return "N/A";
    }
  };

  const idade = calcularIdade(membro.data_nascimento);

  // Construção do HTML com TODOS os campos mapeados do seu formulário
  let htmlContent = `
    <div class="modal-info-grid" style="color: #ecf0f1; font-size: 0.95em; display: flex; flex-direction: column; gap: 20px;">
        
        <section>
            <h4 style="border-bottom: 1px solid #34495e; color: #f1c40f; padding-bottom: 5px; margin-bottom: 10px;">👤 Dados Pessoais</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div><strong>Nome:</strong> ${membro.nome || "N/A"}</div>
                <div><strong>Conhecido como:</strong> ${
                  membro.conhecido_como || "N/A"
                }</div>
                <div><strong>Sexo:</strong> ${membro.sexo || "N/A"}</div>
                <div><strong>Nascimento:</strong> ${formatarDataBR(
                  membro.data_nascimento
                )} (${idade ? idade + " anos" : "N/A"})</div>
                <div><strong>Estado Civil:</strong> ${
                  membro.estado_civil || "N/A"
                }</div>
                <div><strong>Data Casamento:</strong> ${formatarDataBR(
                  membro.data_casamento
                )}</div>
                <div><strong>Naturalidade:</strong> ${
                  membro.naturalidade || "N/A"
                } - ${membro.uf_naturalidade || ""}</div>
                <div><strong>Nacionalidade:</strong> ${
                  membro.nacionalidade || "N/A"
                }</div>
                <div><strong>Profissão:</strong> ${
                  membro.profissao || "N/A"
                }</div>
                <div><strong>Grau Instrução:</strong> ${
                  membro.grau_instrucao || "N/A"
                }</div>
                <div><strong>Tipo Sanguíneo:</strong> ${
                  membro.tipo_sanguineo || "N/A"
                }</div>
                <div><strong>Chefe Familiar:</strong> ${
                  membro.chefe_familiar ? "Sim" : "Não"
                }</div>
            </div>
        </section>
        <section>
            <h4 style="border-bottom: 1px solid #34495e; color: #f1c40f; padding-bottom: 5px; margin-bottom: 10px;">👤 Informmações Complementares</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="grid-column: span 2;"><strong>Info. Complementares:</strong> ${
                  membro.informacoes_complementares || "Nenhuma registrada."
                }</div>
            </div>
        </section>

        <section>
            <h4 style="border-bottom: 1px solid #34495e; color: #f1c40f; padding-bottom: 5px; margin-bottom: 10px;">📞 Contacto e Endereço</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div><strong>Tel. Principal:</strong> ${
                  membro.telefone_principal || "N/A"
                }</div>
                <div><strong>Tel. Secundário:</strong> ${
                  membro.telefone_secundario || "N/A"
                }</div>
                <div style="grid-column: span 2;"><strong>Email:</strong> ${
                  membro.email || "N/A"
                }</div>
                <div style="grid-column: span 2;"><strong>Endereço:</strong> ${
                  membro.logradouro || "N/A"
                }, ${membro.numero || "S/N"}</div>
                <div><strong>Bairro:</strong> ${membro.bairro || "N/A"}</div>
                <div><strong>CEP:</strong> ${membro.cep || "N/A"}</div>
                <div><strong>Cidade:</strong> ${membro.cidade || "N/A"} - ${
    membro.estado || ""
  }</div>
                <div><strong>Complemento:</strong> ${
                  membro.complemento || "N/A"
                }</div>
            </div>
        </section>

        <section>
            <h4 style="border-bottom: 1px solid #34495e; color: #f1c40f; padding-bottom: 5px; margin-bottom: 10px;">💳 Documentação</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div><strong>CPF:</strong> ${membro.cpf || "N/A"}</div>
                <div><strong>Identidade:</strong> ${
                  membro.identidade || "N/A"
                } (${membro.orgao_expedidor || ""})</div>
                <div><strong>Data Expedição:</strong> ${formatarDataBR(
                  membro.data_expedicao
                )}</div>
                <div><strong>Título Eleitor:</strong> ${
                  membro.titulo_eleitor || "N/A"
                } (Z: ${membro.titulo_eleitor_zona || ""}/S: ${
    membro.titulo_eleitor_secao || ""
  })</div>
                <div><strong>Certidão Nasc/Casam:</strong> ${
                  membro.cert_nascimento_casamento || "N/A"
                }</div>
                <div><strong>Reservista:</strong> ${
                  membro.reservista || "N/A"
                }</div>
                <div><strong>CNH:</strong> ${
                  membro.carteira_motorista || "N/A"
                }</div>
            </div>
        </section>

        <section>
            <h4 style="border-bottom: 1px solid #34495e; color: #f1c40f; padding-bottom: 5px; margin-bottom: 10px;">⛪ Vida Eclesiástica</h4>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div><strong>Igreja:</strong> ${membro.igreja || "N/A"}</div>
                <div><strong>Cargo:</strong> ${membro.cargo || "N/A"}</div>
                <div><strong>Tipo Participante:</strong> ${
                  membro.tipo_participante || "N/A"
                }</div>
                <div><strong>Origem Religiosa:</strong> ${
                  membro.origem_religiosa || "N/A"
                }</div>
            </div>
        </section>
        
        <section>
            <h4 style="border-bottom: 1px solid #34495e; color: #f1c40f; padding-bottom: 5px; margin-bottom: 10px;">📜 Histórico Eclesiástico</h4>
            <div style="background: #2c3e50; padding: 10px; border-radius: 5px;">
                ${
                  membro.historicos && membro.historicos.length > 0
                    ? membro.historicos
                        .map(
                          (h) => `
                    <div style="padding: 5px 0; border-bottom: 1px solid #34495e;">
                        <strong>${h.tipo}</strong> - ${formatarDataBR(
                            h.data
                          )}<br>
                        <small>Local: ${h.localidade || "Não informado"}</small>
                    </div>
                `
                        )
                        .join("")
                    : '<p style="font-style: italic; font-size: 0.9em;">Nenhum histórico registrado.</p>'
                }
            </div>
        </section>

        <section>
            <h4 style="border-bottom: 1px solid #34495e; color: #f1c40f; padding-bottom: 5px; margin-bottom: 10px;">🏢 Departamentos</h4>
            <div id="modal-membro-departamentos" style="background: #2c3e50; padding: 10px; border-radius: 5px;">
                <p style="font-style: italic; font-size: 0.9em;">Carregando...</p>
            </div>
        </section>

        <section>
            <h4 style="border-bottom: 1px solid #34495e; color: #f1c40f; padding-bottom: 5px; margin-bottom: 10px;">👨‍👩‍👧‍👦 Familiares</h4>
            <div style="background: #2c3e50; padding: 10px; border-radius: 5px;">
                ${
                  membro.familiares && membro.familiares.length > 0
                    ? membro.familiares
                        .map(
                          (f) => `
                    <div style="padding: 5px 0; border-bottom: 1px solid #34495e;">
                        <strong>${f.nome}</strong> (${f.parentesco})<br>
                        <small>Nascimento: ${formatarDataBR(
                          f.data_nascimento
                        )}</small>
                        ${f.membro_vinculado_id ? `<br><a href="#" onclick="fecharModalVisualizarMembro(); editMembro(${f.membro_vinculado_id}); return false;" style="color: #4a90e2; font-size: 0.85em;">Ver perfil</a>` : ""}
                    </div>
                `
                        )
                        .join("")
                    : '<p style="font-style: italic; font-size: 0.9em;">Nenhum familiar registrado.</p>'
                }
            </div>
        </section>
    </div>
  `;

  viewMode.innerHTML = htmlContent;
  modal.style.display = "block";

  // Carregar departamentos do membro
  carregarDepartamentosMembro(membro.id);
}

async function carregarDepartamentosMembro(membroId) {
  const container = document.getElementById("modal-membro-departamentos");
  try {
    const response = await fetchAuth(`${API_URL}/membros/${membroId}/departamentos`);
    if (!response.ok) {
      container.innerHTML = '<p style="font-style: italic; font-size: 0.9em;">Nenhum departamento vinculado.</p>';
      return;
    }
    const depts = await response.json();
    if (!Array.isArray(depts) || depts.length === 0) {
      container.innerHTML = '<p style="font-style: italic; font-size: 0.9em;">Nenhum departamento vinculado.</p>';
    } else {
      container.innerHTML = depts.map((d) => `
        <div style="padding: 5px 0; border-bottom: 1px solid #34495e;">
          <strong>${d.nome}</strong>
          ${d.cargo_departamento ? ` — <span style="color: #9b59b6; font-weight: bold;">${d.cargo_departamento}</span>` : ""}
          ${d.descricao ? `<br><small style="color: #95a5a6;">${d.descricao}</small>` : ""}
        </div>
      `).join("");
    }
  } catch (error) {
    container.innerHTML = '<p style="font-style: italic; font-size: 0.9em;">Nenhum departamento vinculado.</p>';
  }
}

function fecharModalVisualizarMembro() {
  const modal = document.getElementById("modal-visualizar-membro");
  modal.style.display = "none";
  editingMemberId = null;
  membroAtualModal = null;
}

// ========== CARREGAR DADOS PARA EDIÇÃO (Formulário Principal) ==========
async function carregarDadosParaEdicao(id) {
  try {
    const response = await fetchAuth(`${API_URL}/membros/${id}`);
    const membro = await response.json();

    editingMemberId = id;

    // Resetar formulário antes de preencher
    document.getElementById("membro-form").reset();
    document.getElementById("historicos-container").innerHTML = "";
    document.getElementById("familiares-container").innerHTML = "";

    document.getElementById("form-title").textContent =
      "Editar Membro: " + membro.nome;

    // Ajustar botão de salvar
    const btnSalvar = document.getElementById("btn-salvar-membro");
    if (btnSalvar) {
      btnSalvar.style.display = "";
      btnSalvar.textContent = "Atualizar Membro";
    }

    // Campos Simples
    const camposSimples = [
      "nome",
      "conhecido_como",
      "igreja",
      "cargo",
      "sexo",
      "cep",
      "logradouro",
      "numero",
      "complemento",
      "bairro",
      "cidade",
      "estado",
      "telefone_principal",
      "telefone_secundario",
      "email",
      "cpf",
      "estado_civil",
      "profissao",
      "identidade",
      "orgao_expedidor",
      "grau_instrucao",
      "titulo_eleitor",
      "titulo_eleitor_zona",
      "titulo_eleitor_secao",
      "tipo_sanguineo",
      "cert_nascimento_casamento",
      "reservista",
      "carteira_motorista",
      "naturalidade",
      "uf_naturalidade",
      "nacionalidade",
      "origem_religiosa",
      "tipo_participante",
      "informacoes_complementares",
    ];

    camposSimples.forEach((campo) => {
      const el = document.getElementById(campo);
      if (el) el.value = membro[campo] || "";
    });

    // Campos de Data
    const camposData = ["data_nascimento", "data_expedicao", "data_casamento"];
    camposData.forEach((campo) => {
      const el = document.getElementById(campo);
      if (el) el.value = normalizarDataParaInput(membro[campo]);
    });

    // Checkbox
    document.getElementById("chefe_familiar").checked =
      membro.chefe_familiar || false;

    // Históricos
    if (membro.historicos && membro.historicos.length > 0) {
      membro.historicos.forEach((h) => addHistorico(h));
    }

    // Familiares
    if (membro.familiares && membro.familiares.length > 0) {
      membro.familiares.forEach((f) => addFamiliar(f));
    }

    // Carregar departamento do membro
    try {
      await carregarSelectDepartamentoCadastro();
      const deptResponse = await fetchAuth(`${API_URL}/membros/${id}/departamentos`);
      if (deptResponse.ok) {
        const depts = await deptResponse.json();
        if (Array.isArray(depts) && depts.length > 0) {
          document.getElementById("cadastro-departamento").value = depts[0].id;
          document.getElementById("cargo-dept-group").style.display = "";
          document.getElementById("cadastro-cargo-departamento").value = depts[0].cargo_departamento || "";
        } else {
          document.getElementById("cadastro-departamento").value = "";
          document.getElementById("cargo-dept-group").style.display = "none";
          document.getElementById("cadastro-cargo-departamento").value = "";
        }
      }
    } catch (e) {
      console.log("Erro ao carregar departamento do membro:", e);
    }

    // Navegar para o cadastro e rolar para o topo
    navigateTo("cadastro");
    window.scrollTo(0, 0);
  } catch (error) {
    console.error("Erro ao carregar membro para edição:", error);
    alert("Erro ao carregar dados do membro");
  }
}

async function deleteMembro(id, nome) {
  if (!confirm(`Tem certeza que deseja excluir o membro "${nome}"?`)) {
    return;
  }

  try {
    const response = await fetchAuth(`${API_URL}/membros/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      alert("Membro excluído com sucesso!");
      loadMembros();
    } else {
      alert("Erro ao excluir membro");
    }
  } catch (error) {
    console.error("Erro ao excluir membro:", error);
    alert("Erro ao excluir membro");
  }
}

// ========== EXPORTAR PLANILHA ==========
async function exportarPlanilha() {
  try {
    const response = await fetchAuth(`${API_URL}/membros/exportar`);

    if (!response.ok) {
      throw new Error("Erro ao exportar planilha");
    }

    // Obter o blob da resposta
    const blob = await response.blob();

    // Criar URL para download
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;

    // Nome do arquivo com data atual
    const dataAtual = new Date().toISOString().split("T")[0];
    a.download = `membros_${dataAtual}.xlsx`;

    // Adicionar ao DOM, clicar e remover
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Limpar URL
    window.URL.revokeObjectURL(url);

    alert("Planilha exportada com sucesso!");
  } catch (error) {
    console.error("Erro ao exportar planilha:", error);
    alert("Erro ao exportar planilha. Tente novamente.");
  }
}

function resetForm() {
  editingMemberId = null;
  document.getElementById("form-title").textContent = "Cadastrar Novo Membro";
  document.getElementById("membro-form").reset();
  document.getElementById("historicos-container").innerHTML = "";
  document.getElementById("familiares-container").innerHTML = "";

  // Resetar departamento
  document.getElementById("cadastro-departamento").value = "";
  document.getElementById("cadastro-cargo-departamento").value = "";
  document.getElementById("cargo-dept-group").style.display = "none";

  const btnSalvar = document.getElementById("btn-salvar-membro");
  if (btnSalvar) {
    if (currentUser && currentUser.tipo === "admin") {
      btnSalvar.style.display = "";
      btnSalvar.textContent = "Salvar";
    } else {
      btnSalvar.style.display = "none";
    }
  }
}

function normalizarDataParaInput(data) {
  if (!data) return "";
  if (data.includes("T")) {
    return data.split("T")[0];
  }
  return data;
}

function calcularIdade(dataISO) {
  if (!dataISO) return null;

  try {
    const dataLimpa = dataISO.includes("T") ? dataISO.split("T")[0] : dataISO;
    const [ano, mes, dia] = dataLimpa.split("-").map(Number);
    if (!ano || !mes || !dia) return null;

    const dataNasc = new Date(ano, mes - 1, dia);
    const hoje = new Date();

    let idade = hoje.getFullYear() - dataNasc.getFullYear();
    const diffMes = hoje.getMonth() - dataNasc.getMonth();

    if (diffMes < 0 || (diffMes === 0 && hoje.getDate() < dataNasc.getDate())) {
      idade--;
    }

    return idade;
  } catch {
    return null;
  }
}

// ========== HISTÓRICOS E FAMILIARES (Dinâmicos) ==========
function addHistorico(data = {}) {
  const container = document.getElementById("historicos-container");
  const index = container.children.length;

  const html = `
        <div class="historico-item">
            <h4>
                Histórico ${index + 1}
                <button type="button" class="btn-remove" onclick="this.parentElement.parentElement.remove()">Remover</button>
            </h4>
            <div class="form-grid">
                <div class="form-group">
                    <label>Tipo</label>
                    <select class="historico-tipo">
                        <option value="">Selecione</option>
                        <option value="Conversão" ${
                          data.tipo === "Conversão" ? "selected" : ""
                        }>Conversão</option>
                        <option value="Batismo nas Águas" ${
                          data.tipo === "Batismo nas Águas" ? "selected" : ""
                        }>Batismo nas Águas</option>
                        <option value="Batismo no Espírito Santo" ${
                          data.tipo === "Batismo no Espírito Santo"
                            ? "selected"
                            : ""
                        }>Batismo no Espírito Santo</option>
                        <option value="Consagração a Diácono(isa)" ${
                          data.tipo === "Consagração a Diácono(isa)"
                            ? "selected"
                            : ""
                        }>Consagração a Diácono(isa)</option>
                        <option value="Consagração a Presbítero" ${
                          data.tipo === "Consagração a Presbítero"
                            ? "selected"
                            : ""
                        }>Consagração a Presbítero</option>
                        <option value="Ordenação a Evangelista" ${
                          data.tipo === "Ordenação a Evangelista"
                            ? "selected"
                            : ""
                        }>Ordenação a Evangelista</option>
                        <option value="Ordenação a Pastor(a)" ${
                          data.tipo === "Ordenação a Pastor(a)"
                            ? "selected"
                            : ""
                        }>Ordenação a Pastor(a)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Data</label>
                    <input type="date" class="historico-data"
  value="${normalizarDataParaInput(data.data)}">
                </div>
                <div class="form-group">
                    <label>Localidade</label>
                    <input type="text" class="historico-localidade" value="${
                      data.localidade || ""
                    }">
                </div>
            </div>
        </div>
    `;

  container.insertAdjacentHTML("beforeend", html);
}

function addFamiliar(data = {}) {
  const container = document.getElementById("familiares-container");
  const index = container.children.length;

  const html = `
        <div class="familiar-item">
            <h4>
                Familiar ${index + 1}
                <button type="button" class="btn-remove" onclick="this.parentElement.parentElement.remove()">Remover</button>
            </h4>
            <div class="form-grid">
                <div class="form-group">
                    <label>Parentesco</label>
                    <select class="familiar-parentesco">
                        <option value="">Selecione</option>
                        <option value="Pai" ${
                          data.parentesco === "Pai" ? "selected" : ""
                        }>Pai</option>
                        <option value="Mãe" ${
                          data.parentesco === "Mãe" ? "selected" : ""
                        }>Mãe</option>
                        <option value="Cônjuge" ${
                          data.parentesco === "Cônjuge" ? "selected" : ""
                        }>Cônjuge</option>
                        <option value="Filho(a)" ${
                          data.parentesco === "Filho(a)" ? "selected" : ""
                        }>Filho(a)</option>
                        <option value="Outro" ${
                          data.parentesco === "Outro" ? "selected" : ""
                        }>Outro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Nome</label>
                    <input type="text" class="familiar-nome" value="${
                      data.nome || ""
                    }">
                </div>
                <div class="form-group">
                    <label>Data de Nascimento</label>
                    <input type="date" class="familiar-data"
  value="${normalizarDataParaInput(data.data_nascimento)}">
                </div>
            </div>
        </div>
    `;

  container.insertAdjacentHTML("beforeend", html);
}

// ========== GESTÃO DE USUÁRIOS ==========
async function loadUsuarios() {
  const container = document.getElementById("usuarios-list");
  container.innerHTML = '<div class="loading">Carregando</div>';

  try {
    const response = await fetchAuth(`${API_URL}/usuarios`);
    const data = await response.json();

    if (data.length === 0) {
      container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👤</div>
                    <p>Nenhum usuário cadastrado</p>
                </div>
            `;
      return;
    }

    container.innerHTML = "";
    data.forEach((item) => {
      const ultimoAcesso = item.ultimo_acesso
        ? new Date(item.ultimo_acesso).toLocaleString("pt-BR")
        : "Nunca";
      const criado = new Date(item.created_at).toLocaleDateString("pt-BR");

      container.innerHTML += `
                <div class="list-item">
                    <div class="list-item-header">
                        <span class="list-item-title">${item.nome}</span>
                        <span class="list-item-badge">${
                          item.tipo === "admin" ? "Admin" : "Usuário"
                        }</span>
                    </div>
                    <div class="list-item-info">
                        Email: ${item.email} |
                        Status: ${item.ativo ? "Ativo" : "Inativo"} |
                        Cadastrado em: ${criado} |
                        Último acesso: ${ultimoAcesso}
                    </div>
                    <div class="list-item-actions">
                        <button class="btn-small btn-edit" onclick="editUsuario(${
                          item.id
                        })">Editar</button>
                        ${
                          item.id !== currentUser.id
                            ? `<button class="btn-small btn-delete" onclick="deleteUsuario(${item.id}, '${item.nome}')">Excluir</button>`
                            : ""
                        }
                    </div>
                </div>
            `;
    });
  } catch (error) {
    console.error("Erro ao carregar usuários:", error);
    container.innerHTML =
      '<div class="empty-state"><p>Erro ao carregar dados</p></div>';
  }
}

function abrirModalUsuario() {
  editingUsuarioId = null;
  document.getElementById("modal-usuario-title").textContent = "Novo Usuário";
  document.getElementById("usuario-form").reset();
  document.getElementById("usuario-ativo").checked = true;
  document.getElementById("senha-required").style.display = "";
  document.getElementById("usuario-senha").required = true;
  document.getElementById("senha-hint").textContent = "";
  document.getElementById("modal-usuario").classList.add("show");
}

function fecharModalUsuario() {
  document.getElementById("modal-usuario").classList.remove("show");
}

async function editUsuario(id) {
  try {
    const response = await fetchAuth(`${API_URL}/usuarios`);
    const usuarios = await response.json();
    const usuario = usuarios.find((u) => u.id === id);

    if (!usuario) {
      alert("Usuário não encontrado");
      return;
    }

    editingUsuarioId = id;
    document.getElementById("modal-usuario-title").textContent =
      "Editar Usuário";
    document.getElementById("usuario-nome").value = usuario.nome;
    document.getElementById("usuario-email").value = usuario.email;
    document.getElementById("usuario-senha").value = "";
    document.getElementById("usuario-tipo").value = usuario.tipo;
    document.getElementById("usuario-ativo").checked = usuario.ativo;
    document.getElementById("senha-required").style.display = "none";
    document.getElementById("usuario-senha").required = false;
    document.getElementById("senha-hint").textContent =
      "Deixe em branco para manter a senha atual";
    document.getElementById("modal-usuario").classList.add("show");
  } catch (error) {
    console.error("Erro ao carregar usuário:", error);
    alert("Erro ao carregar dados do usuário");
  }
}

async function handleUsuarioFormSubmit(e) {
  e.preventDefault();

  const formData = {
    nome: document.getElementById("usuario-nome").value,
    email: document.getElementById("usuario-email").value,
    senha: document.getElementById("usuario-senha").value,
    tipo: document.getElementById("usuario-tipo").value,
    ativo: document.getElementById("usuario-ativo").checked,
  };

  try {
    let response;

    if (editingUsuarioId) {
      response = await fetchAuth(`${API_URL}/usuarios/${editingUsuarioId}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
    } else {
      response = await fetchAuth(`${API_URL}/usuarios`, {
        method: "POST",
        body: JSON.stringify(formData),
      });
    }

    if (response.ok) {
      alert(
        editingUsuarioId
          ? "Usuário atualizado com sucesso!"
          : "Usuário criado com sucesso!"
      );
      fecharModalUsuario();
      loadUsuarios();
    } else {
      const error = await response.json();
      alert("Erro: " + (error.error || "Erro desconhecido"));
    }
  } catch (error) {
    console.error("Erro ao salvar usuário:", error);
    alert("Erro ao salvar usuário");
  }
}

async function deleteUsuario(id, nome) {
  if (!confirm(`Deseja realmente excluir o usuário "${nome}"?`)) return;

  try {
    const response = await fetchAuth(`${API_URL}/usuarios/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      alert("Usuário excluído com sucesso!");
      loadUsuarios();
    } else {
      alert("Erro ao excluir usuário");
    }
  } catch (error) {
    console.error("Erro ao excluir usuário:", error);
    alert("Erro ao excluir usuário");
  }
}

// ========== DEPARTAMENTOS ==========
let editingDepartamentoId = null;
let currentDepartamentoId = null;

async function loadDepartamentos() {
  const container = document.getElementById("departamentos-list");
  container.innerHTML = '<div class="loading">Carregando</div>';

  try {
    const response = await fetchAuth(`${API_URL}/departamentos`);
    const data = await response.json();

    if (data.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🏢</div>
          <p>Nenhum departamento cadastrado</p>
        </div>`;
      return;
    }

    container.innerHTML = "";
    data.forEach((dept) => {
      container.innerHTML += `
        <div class="list-item">
          <div class="list-item-header">
            <span class="list-item-title">${dept.nome}</span>
            <span class="list-item-badge">${dept.total_membros} membros</span>
          </div>
          <div class="list-item-info">
            ${dept.descricao || "Sem descrição"}
          </div>
          <div class="list-item-actions">
            <button class="btn-small btn-edit" onclick="abrirModalDeptMembros(${dept.id}, '${dept.nome.replace(/'/g, "\\'")}')">Ver Membros</button>
            ${currentUser.tipo === "admin" ? `
              <button class="btn-small btn-edit" onclick="editDepartamento(${dept.id}, '${dept.nome.replace(/'/g, "\\'")}', '${(dept.descricao || "").replace(/'/g, "\\'")}')">Editar</button>
              <button class="btn-small btn-delete" onclick="deleteDepartamento(${dept.id}, '${dept.nome.replace(/'/g, "\\'")}')">Excluir</button>
            ` : ""}
          </div>
        </div>`;
    });
  } catch (error) {
    console.error("Erro ao carregar departamentos:", error);
    container.innerHTML = '<div class="empty-state"><p>Erro ao carregar dados</p></div>';
  }
}

function abrirModalDepartamento() {
  editingDepartamentoId = null;
  document.getElementById("modal-departamento-title").textContent = "Novo Departamento";
  document.getElementById("departamento-form").reset();
  document.getElementById("modal-departamento").classList.add("show");
}

function fecharModalDepartamento() {
  document.getElementById("modal-departamento").classList.remove("show");
}

function editDepartamento(id, nome, descricao) {
  editingDepartamentoId = id;
  document.getElementById("modal-departamento-title").textContent = "Editar Departamento";
  document.getElementById("departamento-id").value = id;
  document.getElementById("departamento-nome").value = nome;
  document.getElementById("departamento-descricao").value = descricao;
  document.getElementById("modal-departamento").classList.add("show");
}

async function handleDepartamentoFormSubmit(e) {
  e.preventDefault();

  const formData = {
    nome: document.getElementById("departamento-nome").value,
    descricao: document.getElementById("departamento-descricao").value,
  };

  try {
    let response;
    if (editingDepartamentoId) {
      response = await fetchAuth(`${API_URL}/departamentos/${editingDepartamentoId}`, {
        method: "PUT",
        body: JSON.stringify(formData),
      });
    } else {
      response = await fetchAuth(`${API_URL}/departamentos`, {
        method: "POST",
        body: JSON.stringify(formData),
      });
    }

    if (response.ok) {
      alert(editingDepartamentoId ? "Departamento atualizado!" : "Departamento criado!");
      fecharModalDepartamento();
      loadDepartamentos();
      carregarFiltrodepartamentos();
    } else {
      const error = await response.json();
      alert("Erro: " + (error.error || "Erro desconhecido"));
    }
  } catch (error) {
    console.error("Erro ao salvar departamento:", error);
    alert("Erro ao salvar departamento");
  }
}

async function deleteDepartamento(id, nome) {
  if (!confirm(`Deseja excluir o departamento "${nome}"?`)) return;
  try {
    const response = await fetchAuth(`${API_URL}/departamentos/${id}`, { method: "DELETE" });
    if (response.ok) {
      alert("Departamento excluído!");
      loadDepartamentos();
      carregarFiltrodepartamentos();
    } else {
      alert("Erro ao excluir departamento");
    }
  } catch (error) {
    console.error("Erro ao excluir departamento:", error);
    alert("Erro ao excluir departamento");
  }
}

async function abrirModalDeptMembros(deptId, deptNome) {
  currentDepartamentoId = deptId;
  document.getElementById("modal-dept-membros-title").textContent = `Membros - ${deptNome}`;
  const container = document.getElementById("dept-membros-list");
  container.innerHTML = '<div class="loading">Carregando</div>';
  document.getElementById("modal-dept-membros").classList.add("show");

  // Mostrar admin-only elements
  if (currentUser.tipo === "admin") {
    document.querySelectorAll("#modal-dept-membros .admin-only").forEach((el) => {
      el.style.display = "";
    });
    // Popular select de membros
    await carregarSelectMembros();
  }

  try {
    const response = await fetchAuth(`${API_URL}/departamentos/${deptId}/membros`);
    const membros = await response.json();

    if (membros.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>Nenhum membro neste departamento</p></div>';
      return;
    }

    container.innerHTML = "";
    membros.forEach((m) => {
      const idade = calcularIdade(m.data_nascimento);
      const cargoDept = m.cargo_departamento || "";
      const cargoOpcoes = ["Líder", "Vice-Líder", "Regente", "Secretário(a)", "Tesoureiro(a)", "Professor(a)", "Coordenador(a)"];

      container.innerHTML += `
        <div class="list-item">
          <div class="list-item-header">
            <span class="list-item-title">${m.nome}</span>
            <div style="display: flex; gap: 5px; flex-wrap: wrap;">
              ${cargoDept ? `<span class="list-item-badge" style="background-color: #8e44ad;">${cargoDept}</span>` : ""}
              <span class="list-item-badge" style="background-color: ${getCorCargo(m.cargo || 'Membro')}">${m.cargo || "Membro"}</span>
            </div>
          </div>
          <div class="list-item-info">
            ${idade ? `Idade: ${idade} anos | ` : ""}Tipo: ${m.tipo_participante}
            ${m.telefone_principal ? ` | Tel: ${m.telefone_principal}` : ""}
          </div>
          <div class="list-item-actions">
            <button class="btn-small btn-edit" onclick="fecharModalDeptMembros(); editMembro(${m.id})">Visualizar</button>
            ${currentUser.tipo === "admin" ? `
              <select onchange="atualizarCargoDepartamento(${m.id}, this.value)" style="padding: 5px 8px; background: var(--bg-tertiary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: 5px; font-size: 0.85em;">
                <option value="" ${!cargoDept ? "selected" : ""}>Sem cargo</option>
                ${cargoOpcoes.map(c => `<option value="${c}" ${cargoDept === c ? "selected" : ""}>${c}</option>`).join("")}
              </select>
              <button class="btn-small btn-delete" onclick="removerMembroDepartamento(${m.id})">Remover</button>
            ` : ""}
          </div>
        </div>`;
    });
  } catch (error) {
    console.error("Erro ao carregar membros do departamento:", error);
    container.innerHTML = '<div class="empty-state"><p>Erro ao carregar dados</p></div>';
  }
}

function fecharModalDeptMembros() {
  document.getElementById("modal-dept-membros").classList.remove("show");
  currentDepartamentoId = null;
}

async function carregarSelectMembros() {
  try {
    const response = await fetchAuth(`${API_URL}/membros`);
    const membros = await response.json();
    const select = document.getElementById("dept-membro-select");
    select.innerHTML = '<option value="">Selecione um membro</option>';
    membros.forEach((m) => {
      select.innerHTML += `<option value="${m.id}">${m.nome}</option>`;
    });
  } catch (error) {
    console.error("Erro ao carregar membros para select:", error);
  }
}

async function adicionarMembroDepartamento() {
  const membroId = document.getElementById("dept-membro-select").value;
  if (!membroId) {
    alert("Selecione um membro");
    return;
  }
  const cargoDept = document.getElementById("dept-cargo-select").value;
  try {
    const response = await fetchAuth(`${API_URL}/departamentos/${currentDepartamentoId}/membros`, {
      method: "POST",
      body: JSON.stringify({ membro_id: parseInt(membroId), cargo_departamento: cargoDept || null }),
    });
    if (response.ok) {
      // Recarregar lista de membros do departamento
      const deptNome = document.getElementById("modal-dept-membros-title").textContent.replace("Membros - ", "");
      abrirModalDeptMembros(currentDepartamentoId, deptNome);
      loadDepartamentos();
    } else {
      const error = await response.json();
      alert("Erro: " + (error.error || "Erro desconhecido"));
    }
  } catch (error) {
    console.error("Erro ao adicionar membro:", error);
    alert("Erro ao adicionar membro ao departamento");
  }
}

async function atualizarCargoDepartamento(membroId, novoCargo) {
  try {
    const response = await fetchAuth(`${API_URL}/departamentos/${currentDepartamentoId}/membros/${membroId}`, {
      method: "PUT",
      body: JSON.stringify({ cargo_departamento: novoCargo || null }),
    });
    if (!response.ok) {
      alert("Erro ao atualizar cargo");
    }
  } catch (error) {
    console.error("Erro ao atualizar cargo:", error);
    alert("Erro ao atualizar cargo no departamento");
  }
}

async function removerMembroDepartamento(membroId) {
  if (!confirm("Remover este membro do departamento?")) return;
  try {
    const response = await fetchAuth(`${API_URL}/departamentos/${currentDepartamentoId}/membros/${membroId}`, {
      method: "DELETE",
    });
    if (response.ok) {
      const deptNome = document.getElementById("modal-dept-membros-title").textContent.replace("Membros - ", "");
      abrirModalDeptMembros(currentDepartamentoId, deptNome);
      loadDepartamentos();
    } else {
      alert("Erro ao remover membro");
    }
  } catch (error) {
    console.error("Erro ao remover membro:", error);
    alert("Erro ao remover membro do departamento");
  }
}

async function carregarSelectDepartamentoCadastro() {
  try {
    const response = await fetchAuth(`${API_URL}/departamentos`);
    if (!response.ok) return;
    const data = await response.json();
    if (!Array.isArray(data)) return;
    const select = document.getElementById("cadastro-departamento");
    select.innerHTML = '<option value="">Nenhum</option>';
    data.forEach((dept) => {
      select.innerHTML += `<option value="${dept.id}">${dept.nome}</option>`;
    });
  } catch (error) {
    console.log("Departamentos não disponíveis para cadastro");
  }
}

async function carregarFiltrodepartamentos() {
  try {
    const response = await fetchAuth(`${API_URL}/departamentos`);
    if (!response.ok) return;
    const data = await response.json();
    if (!Array.isArray(data)) return;
    const select = document.getElementById("departamento-filter");
    const valorAtual = select.value;
    select.innerHTML = '<option value="">Todos os Departamentos</option>';
    data.forEach((dept) => {
      select.innerHTML += `<option value="${dept.id}">${dept.nome}</option>`;
    });
    select.value = valorAtual;
  } catch (error) {
    console.log("Departamentos ainda não disponíveis");
  }
}

// ========== CADASTRO DE VISITANTE ==========
function abrirModalVisitante() {
  document.getElementById("visitante-form").reset();
  document.getElementById("modal-visitante").classList.add("show");
}

function fecharModalVisitante() {
  document.getElementById("modal-visitante").classList.remove("show");
}

async function buscarCEPVisitante() {
  const cepInput = document.getElementById("visitante-cep");
  const cep = cepInput.value.replace(/\D/g, "");
  if (cep.length !== 8) return;

  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json();
    if (data.erro) {
      alert("CEP não encontrado");
      return;
    }
    document.getElementById("visitante-logradouro").value = data.logradouro || "";
    document.getElementById("visitante-bairro").value = data.bairro || "";
    document.getElementById("visitante-cidade").value = data.localidade || "";
    document.getElementById("visitante-estado").value = data.uf || "";
    document.getElementById("visitante-numero").focus();
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
    alert("Erro ao buscar CEP");
  }
}

async function handleVisitanteFormSubmit(e) {
  e.preventDefault();

  const formData = {
    nome: document.getElementById("visitante-nome").value,
    data_nascimento: document.getElementById("visitante-data_nascimento").value,
    telefone_principal: document.getElementById("visitante-telefone").value,
    cep: document.getElementById("visitante-cep").value,
    logradouro: document.getElementById("visitante-logradouro").value,
    numero: document.getElementById("visitante-numero").value,
    bairro: document.getElementById("visitante-bairro").value,
    cidade: document.getElementById("visitante-cidade").value,
    estado: document.getElementById("visitante-estado").value,
    tipo_participante: "Visitante",
    historicos: [],
    familiares: [],
  };

  try {
    const response = await fetchAuth(`${API_URL}/membros`, {
      method: "POST",
      body: JSON.stringify(formData),
    });

    if (response.ok) {
      alert("Visitante cadastrado com sucesso!");
      fecharModalVisitante();
      if (currentPage === "membros") loadMembros();
    } else {
      const error = await response.json();
      alert("Erro: " + (error.error || "Erro desconhecido"));
    }
  } catch (error) {
    console.error("Erro ao cadastrar visitante:", error);
    alert("Erro ao cadastrar visitante");
  }
}

// ========== UTILITÁRIOS ==========
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
