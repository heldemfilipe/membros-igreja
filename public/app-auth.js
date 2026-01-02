const API_URL = 'http://localhost:3000/api';

// Estado global
let currentPage = 'dashboard';
let editingMemberId = null;
let editingUsuarioId = null;
let currentUser = null;
let authToken = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacao();
});

// ========== AUTENTICAÇÃO ==========
async function verificarAutenticacao() {
    authToken = localStorage.getItem('token');
    const usuarioStr = localStorage.getItem('usuario');

    if (!authToken || !usuarioStr) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/verify`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            throw new Error('Token inválido');
        }

        const data = await response.json();
        currentUser = data.usuario;

        document.getElementById('user-name').textContent = currentUser.nome;

        // Mostrar menu de usuários apenas para admin
        if (currentUser.tipo === 'admin') {
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = '';
            });
        }

        initApp();
    } catch (error) {
        console.error('Erro na autenticação:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'login.html';
    }
}

async function logout() {
    try {
        await fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'login.html';
    }
}

// Função auxiliar para requisições autenticadas
async function fetchAuth(url, options = {}) {
    const headers = {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = 'login.html';
        throw new Error('Não autorizado');
    }

    return response;
}

// ========== INICIALIZAÇÃO DO APP ==========
function initApp() {
    initNavigation();
    initFilters();
    loadDashboard();

    const mesAtual = new Date().getMonth() + 1;
    document.getElementById('mes-filter').value = mesAtual;

    document.getElementById('membro-form').addEventListener('submit', handleFormSubmit);
    document.getElementById('usuario-form').addEventListener('submit', handleUsuarioFormSubmit);
}

// ========== NAVEGAÇÃO ==========
function initNavigation() {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            navigateTo(page);
        });
    });
}

function navigateTo(page) {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.page === page);
    });

    document.querySelectorAll('.page').forEach(p => {
        p.classList.toggle('active', p.id === `${page}-page`);
    });

    currentPage = page;

    switch(page) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'aniversariantes':
            loadAniversariantes();
            break;
        case 'membros':
            loadMembros();
            break;
        case 'cadastro':
            resetForm();
            break;
        case 'usuarios':
            if (currentUser.tipo === 'admin') {
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

        document.getElementById('total-membros').textContent = data.total_membros || 0;
        document.getElementById('total-congregados').textContent = data.total_congregados || 0;
        document.getElementById('total-geral').textContent = data.total_geral || 0;

        const chartSexo = document.getElementById('chart-sexo');
        chartSexo.innerHTML = '';
        if (data.por_sexo && data.por_sexo.length > 0) {
            data.por_sexo.forEach(item => {
                chartSexo.innerHTML += `
                    <div class="chart-item">
                        <span class="chart-label">${item.sexo || 'Não informado'}</span>
                        <span class="chart-value">${item.total}</span>
                    </div>
                `;
            });
        } else {
            chartSexo.innerHTML = '<div class="empty-state"><p>Nenhum dado disponível</p></div>';
        }

        const chartTipo = document.getElementById('chart-tipo');
        chartTipo.innerHTML = '';
        if (data.por_tipo && data.por_tipo.length > 0) {
            data.por_tipo.forEach(item => {
                chartTipo.innerHTML += `
                    <div class="chart-item">
                        <span class="chart-label">${item.tipo_participante}</span>
                        <span class="chart-value">${item.total}</span>
                    </div>
                `;
            });
        } else {
            chartTipo.innerHTML = '<div class="empty-state"><p>Nenhum dado disponível</p></div>';
        }
    } catch (error) {
        console.error('Erro ao carregar dashboard:', error);
        alert('Erro ao carregar dados do dashboard');
    }
}

// ========== ANIVERSARIANTES ==========
function initFilters() {
    document.getElementById('mes-filter').addEventListener('change', loadAniversariantes);
    document.getElementById('search-input').addEventListener('input', debounce(loadMembros, 500));
    document.getElementById('tipo-filter').addEventListener('change', loadMembros);
}

async function loadAniversariantes() {
    const mes = document.getElementById('mes-filter').value;
    const container = document.getElementById('aniversariantes-list');
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

        container.innerHTML = '';
        data.forEach(item => {
            const dataNasc = new Date(item.data_nascimento + 'T00:00:00');
            const dia = dataNasc.getDate();
            const idade = new Date().getFullYear() - dataNasc.getFullYear();

            container.innerHTML += `
                <div class="list-item">
                    <div class="list-item-header">
                        <span class="list-item-title">${item.nome}</span>
                        <span class="list-item-badge">${dia}/${mes}</span>
                    </div>
                    <div class="list-item-info">
                        ${item.conhecido_como ? `Conhecido como: ${item.conhecido_como} | ` : ''}
                        Idade: ${idade} anos |
                        Tipo: ${item.tipo_participante}
                        ${item.telefone_principal ? ` | Tel: ${item.telefone_principal}` : ''}
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Erro ao carregar aniversariantes:', error);
        container.innerHTML = '<div class="empty-state"><p>Erro ao carregar dados</p></div>';
    }
}

// ========== LISTA DE MEMBROS ==========
async function loadMembros() {
    const search = document.getElementById('search-input').value;
    const tipo = document.getElementById('tipo-filter').value;
    const container = document.getElementById('membros-list');
    container.innerHTML = '<div class="loading">Carregando</div>';

    try {
        let url = `${API_URL}/membros?`;
        if (search) url += `search=${encodeURIComponent(search)}&`;
        if (tipo) url += `tipo=${encodeURIComponent(tipo)}`;

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

        container.innerHTML = '';
        data.forEach(item => {
            const dataNasc = item.data_nascimento ? new Date(item.data_nascimento + 'T00:00:00') : null;
            const idade = dataNasc ? new Date().getFullYear() - dataNasc.getFullYear() : 'N/A';

            container.innerHTML += `
                <div class="list-item">
                    <div class="list-item-header">
                        <span class="list-item-title">${item.nome}</span>
                        <span class="list-item-badge">${item.tipo_participante}</span>
                    </div>
                    <div class="list-item-info">
                        ${item.conhecido_como ? `Conhecido como: ${item.conhecido_como} | ` : ''}
                        ${item.sexo ? `${item.sexo} | ` : ''}
                        Idade: ${idade} anos
                        ${item.telefone_principal ? ` | Tel: ${item.telefone_principal}` : ''}
                        ${item.cargo ? ` | Cargo: ${item.cargo}` : ''}
                    </div>
                    <div class="list-item-actions">
                        <button class="btn-small btn-edit" onclick="editMembro(${item.id})">Editar</button>
                        <button class="btn-small btn-delete" onclick="deleteMembro(${item.id}, '${item.nome}')">Excluir</button>
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Erro ao carregar membros:', error);
        container.innerHTML = '<div class="empty-state"><p>Erro ao carregar dados</p></div>';
    }
}

// ========== FORMULÁRIO DE MEMBROS ==========
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        nome: document.getElementById('nome').value,
        conhecido_como: document.getElementById('conhecido_como').value,
        igreja: document.getElementById('igreja').value,
        cargo: document.getElementById('cargo').value,
        sexo: document.getElementById('sexo').value,
        data_nascimento: document.getElementById('data_nascimento').value,
        cep: document.getElementById('cep').value,
        logradouro: document.getElementById('logradouro').value,
        numero: document.getElementById('numero').value,
        complemento: document.getElementById('complemento').value,
        bairro: document.getElementById('bairro').value,
        cidade: document.getElementById('cidade').value,
        estado: document.getElementById('estado').value,
        telefone_principal: document.getElementById('telefone_principal').value,
        telefone_secundario: document.getElementById('telefone_secundario').value,
        email: document.getElementById('email').value,
        cpf: document.getElementById('cpf').value,
        estado_civil: document.getElementById('estado_civil').value,
        profissao: document.getElementById('profissao').value,
        identidade: document.getElementById('identidade').value,
        orgao_expedidor: document.getElementById('orgao_expedidor').value,
        data_expedicao: document.getElementById('data_expedicao').value,
        grau_instrucao: document.getElementById('grau_instrucao').value,
        titulo_eleitor: document.getElementById('titulo_eleitor').value,
        titulo_eleitor_zona: document.getElementById('titulo_eleitor_zona').value,
        titulo_eleitor_secao: document.getElementById('titulo_eleitor_secao').value,
        tipo_sanguineo: document.getElementById('tipo_sanguineo').value,
        cert_nascimento_casamento: document.getElementById('cert_nascimento_casamento').value,
        reservista: document.getElementById('reservista').value,
        carteira_motorista: document.getElementById('carteira_motorista').value,
        chefe_familiar: document.getElementById('chefe_familiar').checked,
        data_casamento: document.getElementById('data_casamento').value,
        naturalidade: document.getElementById('naturalidade').value,
        uf_naturalidade: document.getElementById('uf_naturalidade').value,
        nacionalidade: document.getElementById('nacionalidade').value,
        origem_religiosa: document.getElementById('origem_religiosa').value,
        tipo_participante: document.getElementById('tipo_participante').value,
        informacoes_complementares: document.getElementById('informacoes_complementares').value,
        historicos: collectHistoricos(),
        familiares: collectFamiliares()
    };

    try {
        let response;
        if (editingMemberId) {
            response = await fetchAuth(`${API_URL}/membros/${editingMemberId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
        } else {
            response = await fetchAuth(`${API_URL}/membros`, {
                method: 'POST',
                body: JSON.stringify(formData)
            });
        }

        const result = await response.json();

        if (response.ok) {
            alert(editingMemberId ? 'Membro atualizado com sucesso!' : 'Membro cadastrado com sucesso!');
            resetForm();
            navigateTo('membros');
        } else {
            alert('Erro ao salvar: ' + result.error);
        }
    } catch (error) {
        console.error('Erro ao salvar membro:', error);
        alert('Erro ao salvar membro');
    }
}

function collectHistoricos() {
    const historicos = [];
    document.querySelectorAll('.historico-item').forEach(item => {
        const tipo = item.querySelector('.historico-tipo').value;
        const data = item.querySelector('.historico-data').value;
        const localidade = item.querySelector('.historico-localidade').value;

        if (tipo && data) {
            historicos.push({ tipo, data, localidade });
        }
    });
    return historicos;
}

function collectFamiliares() {
    const familiares = [];
    document.querySelectorAll('.familiar-item').forEach(item => {
        const parentesco = item.querySelector('.familiar-parentesco').value;
        const nome = item.querySelector('.familiar-nome').value;
        const data_nascimento = item.querySelector('.familiar-data').value;

        if (parentesco && nome) {
            familiares.push({ parentesco, nome, data_nascimento });
        }
    });
    return familiares;
}

async function editMembro(id) {
    try {
        const response = await fetchAuth(`${API_URL}/membros/${id}`);
        const membro = await response.json();

        editingMemberId = id;
        document.getElementById('form-title').textContent = 'Editar Membro';

        // Preencher campos básicos
        document.getElementById('nome').value = membro.nome || '';
        document.getElementById('conhecido_como').value = membro.conhecido_como || '';
        document.getElementById('igreja').value = membro.igreja || '';
        document.getElementById('cargo').value = membro.cargo || '';
        document.getElementById('sexo').value = membro.sexo || '';
        document.getElementById('data_nascimento').value = membro.data_nascimento || '';
        document.getElementById('cep').value = membro.cep || '';
        document.getElementById('logradouro').value = membro.logradouro || '';
        document.getElementById('numero').value = membro.numero || '';
        document.getElementById('complemento').value = membro.complemento || '';
        document.getElementById('bairro').value = membro.bairro || '';
        document.getElementById('cidade').value = membro.cidade || '';
        document.getElementById('estado').value = membro.estado || '';
        document.getElementById('telefone_principal').value = membro.telefone_principal || '';
        document.getElementById('telefone_secundario').value = membro.telefone_secundario || '';
        document.getElementById('email').value = membro.email || '';
        document.getElementById('cpf').value = membro.cpf || '';
        document.getElementById('estado_civil').value = membro.estado_civil || '';
        document.getElementById('profissao').value = membro.profissao || '';
        document.getElementById('identidade').value = membro.identidade || '';
        document.getElementById('orgao_expedidor').value = membro.orgao_expedidor || '';
        document.getElementById('data_expedicao').value = membro.data_expedicao || '';
        document.getElementById('grau_instrucao').value = membro.grau_instrucao || '';
        document.getElementById('titulo_eleitor').value = membro.titulo_eleitor || '';
        document.getElementById('titulo_eleitor_zona').value = membro.titulo_eleitor_zona || '';
        document.getElementById('titulo_eleitor_secao').value = membro.titulo_eleitor_secao || '';
        document.getElementById('tipo_sanguineo').value = membro.tipo_sanguineo || '';
        document.getElementById('cert_nascimento_casamento').value = membro.cert_nascimento_casamento || '';
        document.getElementById('reservista').value = membro.reservista || '';
        document.getElementById('carteira_motorista').value = membro.carteira_motorista || '';
        document.getElementById('chefe_familiar').checked = membro.chefe_familiar || false;
        document.getElementById('data_casamento').value = membro.data_casamento || '';
        document.getElementById('naturalidade').value = membro.naturalidade || '';
        document.getElementById('uf_naturalidade').value = membro.uf_naturalidade || '';
        document.getElementById('nacionalidade').value = membro.nacionalidade || '';
        document.getElementById('origem_religiosa').value = membro.origem_religiosa || '';
        document.getElementById('tipo_participante').value = membro.tipo_participante || 'Membro';
        document.getElementById('informacoes_complementares').value = membro.informacoes_complementares || '';

        // Preencher históricos
        const historicosContainer = document.getElementById('historicos-container');
        historicosContainer.innerHTML = '';
        if (membro.historicos && membro.historicos.length > 0) {
            membro.historicos.forEach(h => {
                addHistorico(h);
            });
        }

        // Preencher familiares
        const familiaresContainer = document.getElementById('familiares-container');
        familiaresContainer.innerHTML = '';
        if (membro.familiares && membro.familiares.length > 0) {
            membro.familiares.forEach(f => {
                addFamiliar(f);
            });
        }

        navigateTo('cadastro');
    } catch (error) {
        console.error('Erro ao carregar membro:', error);
        alert('Erro ao carregar dados do membro');
    }
}

async function deleteMembro(id, nome) {
    if (!confirm(`Tem certeza que deseja excluir o membro "${nome}"?`)) {
        return;
    }

    try {
        const response = await fetchAuth(`${API_URL}/membros/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Membro excluído com sucesso!');
            loadMembros();
        } else {
            alert('Erro ao excluir membro');
        }
    } catch (error) {
        console.error('Erro ao excluir membro:', error);
        alert('Erro ao excluir membro');
    }
}

function resetForm() {
    editingMemberId = null;
    document.getElementById('form-title').textContent = 'Cadastrar Novo Membro';
    document.getElementById('membro-form').reset();
    document.getElementById('historicos-container').innerHTML = '';
    document.getElementById('familiares-container').innerHTML = '';
}

// ========== HISTÓRICOS E FAMILIARES ==========
function addHistorico(data = {}) {
    const container = document.getElementById('historicos-container');
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
                        <option value="Conversão" ${data.tipo === 'Conversão' ? 'selected' : ''}>Conversão</option>
                        <option value="Batismo nas Águas" ${data.tipo === 'Batismo nas Águas' ? 'selected' : ''}>Batismo nas Águas</option>
                        <option value="Batismo no Espírito Santo" ${data.tipo === 'Batismo no Espírito Santo' ? 'selected' : ''}>Batismo no Espírito Santo</option>
                        <option value="Consagração a Diácono(isa)" ${data.tipo === 'Consagração a Diácono(isa)' ? 'selected' : ''}>Consagração a Diácono(isa)</option>
                        <option value="Consagração a Presbítero" ${data.tipo === 'Consagração a Presbítero' ? 'selected' : ''}>Consagração a Presbítero</option>
                        <option value="Ordenação a Evangelista" ${data.tipo === 'Ordenação a Evangelista' ? 'selected' : ''}>Ordenação a Evangelista</option>
                        <option value="Ordenação a Pastor(a)" ${data.tipo === 'Ordenação a Pastor(a)' ? 'selected' : ''}>Ordenação a Pastor(a)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Data</label>
                    <input type="date" class="historico-data" value="${data.data || ''}">
                </div>
                <div class="form-group">
                    <label>Localidade</label>
                    <input type="text" class="historico-localidade" value="${data.localidade || ''}">
                </div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', html);
}

function addFamiliar(data = {}) {
    const container = document.getElementById('familiares-container');
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
                        <option value="Pai" ${data.parentesco === 'Pai' ? 'selected' : ''}>Pai</option>
                        <option value="Mãe" ${data.parentesco === 'Mãe' ? 'selected' : ''}>Mãe</option>
                        <option value="Cônjuge" ${data.parentesco === 'Cônjuge' ? 'selected' : ''}>Cônjuge</option>
                        <option value="Filho(a)" ${data.parentesco === 'Filho(a)' ? 'selected' : ''}>Filho(a)</option>
                        <option value="Outro" ${data.parentesco === 'Outro' ? 'selected' : ''}>Outro</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Nome</label>
                    <input type="text" class="familiar-nome" value="${data.nome || ''}">
                </div>
                <div class="form-group">
                    <label>Data de Nascimento</label>
                    <input type="date" class="familiar-data" value="${data.data_nascimento || ''}">
                </div>
            </div>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', html);
}

// ========== GESTÃO DE USUÁRIOS ==========
async function loadUsuarios() {
    const container = document.getElementById('usuarios-list');
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

        container.innerHTML = '';
        data.forEach(item => {
            const ultimoAcesso = item.ultimo_acesso ? new Date(item.ultimo_acesso).toLocaleString('pt-BR') : 'Nunca';
            const criado = new Date(item.created_at).toLocaleDateString('pt-BR');

            container.innerHTML += `
                <div class="list-item">
                    <div class="list-item-header">
                        <span class="list-item-title">${item.nome}</span>
                        <span class="list-item-badge">${item.tipo === 'admin' ? 'Admin' : 'Usuário'}</span>
                    </div>
                    <div class="list-item-info">
                        Email: ${item.email} |
                        Status: ${item.ativo ? 'Ativo' : 'Inativo'} |
                        Cadastrado em: ${criado} |
                        Último acesso: ${ultimoAcesso}
                    </div>
                    <div class="list-item-actions">
                        <button class="btn-small btn-edit" onclick="editUsuario(${item.id})">Editar</button>
                        ${item.id !== currentUser.id ? `<button class="btn-small btn-delete" onclick="deleteUsuario(${item.id}, '${item.nome}')">Excluir</button>` : ''}
                    </div>
                </div>
            `;
        });
    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        container.innerHTML = '<div class="empty-state"><p>Erro ao carregar dados</p></div>';
    }
}

function abrirModalUsuario() {
    editingUsuarioId = null;
    document.getElementById('modal-usuario-title').textContent = 'Novo Usuário';
    document.getElementById('usuario-form').reset();
    document.getElementById('usuario-ativo').checked = true;
    document.getElementById('senha-required').style.display = '';
    document.getElementById('usuario-senha').required = true;
    document.getElementById('senha-hint').textContent = '';
    document.getElementById('modal-usuario').classList.add('show');
}

function fecharModalUsuario() {
    document.getElementById('modal-usuario').classList.remove('show');
}

async function editUsuario(id) {
    try {
        const response = await fetchAuth(`${API_URL}/usuarios`);
        const usuarios = await response.json();
        const usuario = usuarios.find(u => u.id === id);

        if (!usuario) {
            alert('Usuário não encontrado');
            return;
        }

        editingUsuarioId = id;
        document.getElementById('modal-usuario-title').textContent = 'Editar Usuário';
        document.getElementById('usuario-nome').value = usuario.nome;
        document.getElementById('usuario-email').value = usuario.email;
        document.getElementById('usuario-senha').value = '';
        document.getElementById('usuario-tipo').value = usuario.tipo;
        document.getElementById('usuario-ativo').checked = usuario.ativo;
        document.getElementById('senha-required').style.display = 'none';
        document.getElementById('usuario-senha').required = false;
        document.getElementById('senha-hint').textContent = 'Deixe em branco para manter a senha atual';
        document.getElementById('modal-usuario').classList.add('show');
    } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        alert('Erro ao carregar dados do usuário');
    }
}

async function handleUsuarioFormSubmit(e) {
    e.preventDefault();

    const formData = {
        nome: document.getElementById('usuario-nome').value,
        email: document.getElementById('usuario-email').value,
        senha: document.getElementById('usuario-senha').value,
        tipo: document.getElementById('usuario-tipo').value,
        ativo: document.getElementById('usuario-ativo').checked
    };

    // Remover senha vazia ao editar
    if (editingUsuarioId && !formData.senha) {
        delete formData.senha;
    }

    try {
        let response;
        if (editingUsuarioId) {
            response = await fetchAuth(`${API_URL}/usuarios/${editingUsuarioId}`, {
                method: 'PUT',
                body: JSON.stringify(formData)
            });
        } else {
            response = await fetchAuth(`${API_URL}/usuarios`, {
                method: 'POST',
                body: JSON.stringify(formData)
            });
        }

        const result = await response.json();

        if (response.ok) {
            alert(editingUsuarioId ? 'Usuário atualizado com sucesso!' : 'Usuário criado com sucesso!');
            fecharModalUsuario();
            loadUsuarios();
        } else {
            alert('Erro ao salvar: ' + result.error);
        }
    } catch (error) {
        console.error('Erro ao salvar usuário:', error);
        alert('Erro ao salvar usuário');
    }
}

async function deleteUsuario(id, nome) {
    if (!confirm(`Tem certeza que deseja excluir o usuário "${nome}"?`)) {
        return;
    }

    try {
        const response = await fetchAuth(`${API_URL}/usuarios/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            alert('Usuário excluído com sucesso!');
            loadUsuarios();
        } else {
            const result = await response.json();
            alert('Erro ao excluir: ' + result.error);
        }
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        alert('Erro ao excluir usuário');
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
