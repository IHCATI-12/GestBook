// dashboard_bibliotecario.js

// -------------------------------
// CONFIGURAÇÃO DA API E ESTADO GLOBAL
// -------------------------------
const API_URL = "http://127.0.0.1:8000";
let BIBLIOTECARIO_ID = null; 
const TODAY = new Date().toISOString().split('T')[0]; // Data de hoje no formato YYYY-MM-DD
let activeLoansCache = []; // Cache para armazenar os empréstimos ativos e aplicar filtros


// ----------------------------------------------------------------
// FUNÇÕES UTILITÁRIAS
// ----------------------------------------------------------------

/**
 * Exibe uma mensagem de feedback em um container específico.
 * @param {string} containerId - O ID do container (div.form-container, por exemplo).
 * @param {string} message - O texto da mensagem.
 * @param {boolean} isError - Se a mensagem é de erro (true) ou sucesso (false).
 */
function showMessage(containerId, message, isError = false) {
    const container = document.getElementById(containerId);
    // Tenta encontrar um container mais genérico se o ID específico não for um form-container.
    const targetContainer = container || document.getElementById('loan-create-form-container'); 
    if (!targetContainer) return;

    // Remove mensagens antigas da mesma natureza
    targetContainer.querySelectorAll('.error-message, .success-message').forEach(el => el.remove());

    // Cria um elemento para a mensagem dentro do container
    const messageElement = document.createElement('p');
    const messageClass = isError ? 'error-message' : 'success-message';
    messageElement.className = messageClass;
    messageElement.innerHTML = message;
    
    // Adiciona a mensagem e define um timeout para removê-la
    targetContainer.insertBefore(messageElement, targetContainer.firstChild);

    setTimeout(() => {
        messageElement.remove();
    }, 5000);
}

/**
 * Tenta extrair e simplificar a mensagem de erro detalhada de uma resposta da API (FastAPI/Pydantic).
 * @param {Object} result - O objeto JSON retornado pela API.
 * @returns {string} - A mensagem de erro formatada e simplificada.
 */
function extractApiErrorMessage(result) {
    if (result && result.detail) {
        // Trata erros de validação do Pydantic (status 422)
        if (Array.isArray(result.detail) && result.detail.length > 0) {
            const dateError = result.detail.find(err => err.loc && err.loc.includes('data_nascimento'));
            
            if (dateError) {
                const simplifiedMsg = dateError.msg
                    .replace(/Value error, /g, '')
                    .replace(/\(\d{4}-\d{2}-\d{2}\)\./g, '.');
                return `**Data Nascimento**: ${simplifiedMsg}`;
            }

            let errorMessages = result.detail.map(err => {
                const loc = err.loc ? err.loc.slice(1).join('.') : 'API';
                const msg = err.msg.length > 50 ? err.msg.substring(0, 50) + '...' : err.msg;
                return `**${loc}**: ${msg}`;
            }).join('; ');
            return `Erros de Validação: ${errorMessages}`;
        }
        // Trata erros de detalhe genérico
        return result.detail.toString();
    }
    // Trata outros formatos
    return 'Erro desconhecido. Verifique o console para mais detalhes.';
}


/**
 * SUBSTITUIÇÃO PARA window.confirm()
 * Exibe um modal customizado de confirmação.
 * @param {string} title - Título do modal.
 * @param {string} message - Mensagem de confirmação.
 * @param {string} confirmText - Texto do botão de confirmação.
 * @returns {Promise<boolean>} - Resolve para true se confirmado, false se cancelado.
 */
function customConfirm(title, message, confirmText = 'Confirmar') {
    return new Promise(resolve => {
        const modal = document.getElementById('custom-confirm-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const btnConfirm = document.getElementById('btn-confirm');
        const btnCancel = document.getElementById('btn-cancel');

        modalTitle.textContent = title;
        modalMessage.textContent = message;
        btnConfirm.textContent = confirmText;

        // Limpa listeners anteriores
        btnConfirm.onclick = null;
        btnCancel.onclick = null;

        // Configura ações
        btnConfirm.onclick = () => {
            modal.classList.remove('active');
            resolve(true);
        };

        btnCancel.onclick = () => {
            modal.classList.remove('active');
            resolve(false);
        };

        // Exibe o modal
        modal.classList.add('active');
    });
}


/**
 * Ativa uma seção de conteúdo específica e desativa as outras.
 * @param {string} sectionId - O ID da seção a ser ativada (ex: 'emprestimos-section').
 */
function activateSection(sectionId) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');

    // Atualiza o menu e o título do header
    document.querySelectorAll('.main-menu .menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
            const title = item.textContent.trim();
            document.getElementById('current-section-title').textContent = title;
        }
    });
    
    // Ações específicas ao trocar de seção
    switch (sectionId) {
        case 'dashboard-home':
            loadSummaryData();
            break;
        case 'emprestimos-section':
            loadLoanCreationData();
            // 🚨 Limpa o cache ao entrar na seção para buscar dados mais frescos
            activeLoansCache = []; 
            loadActiveLoansAdmin({}); 
            break;
        case 'gerenciar-livros-section':
            loadBookCreationData();
            loadBookDeleteOptions(); 
            break;
        case 'gerenciar-autores-section':
            loadAuthorDeleteOptions();
            break;
        case 'gerenciar-generos-section':
            loadGenreDeleteOptions();
            break;
        case 'catalogo-section':
            loadBooks(document.getElementById('book-grid-admin'));
            break;
    }
}

/**
 * Função auxiliar para preencher um select com dados da API.
 * @param {string} url - A URL da API para buscar os dados.
 * @param {string} selectId - O ID do elemento select.
 * @param {string} keyId - A chave do objeto a ser usada como `value` (ex: 'autor_id').
 * @param {function|string} keyName - A chave do objeto ou função para formatar o `textContent`.
 * @param {string} defaultText - Texto da opção padrão.
 */
async function fillSelect(url, selectId, keyId, keyName, defaultText) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = `<option value="" disabled selected>${defaultText}</option>`;
    
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        
        select.innerHTML = `<option value="" disabled selected>${defaultText}</option>`;
        if (!response.ok) {
            console.error(`Falha ao carregar ${selectId}:`, data.detail);
            select.innerHTML = `<option value="" disabled selected>Erro ao carregar dados.</option>`;
            if(select.id === 'loan-leitor-id' || select.id === 'filter-leitor-id'){
                showMessage(select.closest('.form-container') || document.body, `❌ Falha ao carregar Leitores: ${data.detail || 'Verifique o console.'}`, true);
            }
            return;
        }

        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item[keyId]; // Usa a chave 'keyId' para o valor
            option.textContent = typeof keyName === 'function' ? keyName(item) : item[keyName];
            select.appendChild(option);
        });
        
        // Se a primeira opção for a de carregamento, remove-a se houver dados
        if (data.length > 0) {
            select.querySelector('option[disabled][selected]').textContent = defaultText;
        } else {
             select.innerHTML = `<option value="" disabled selected>Nenhum dado encontrado.</option>`;
        }

    } catch (error) {
        console.error(`Falha ao carregar ${selectId}:`, error);
        select.innerHTML = `<option value="" disabled selected>Erro ao carregar dados.</option>`;
    }
}


// ----------------------------------------------------------------
// GERENCIAR AUTORES
// ----------------------------------------------------------------

// CREATE
async function createAuthor(event) {
    event.preventDefault();

    const nome = document.getElementById('author-nome').value;
    const sobrenome = document.getElementById('author-sobrenome').value;
    const data_nascimento = document.getElementById('author-data-nascimento').value;
    const nacionalidade = document.getElementById('author-nacionalidade').value;
    const form = document.getElementById('create-author-form');

    const authorData = { 
        nome, 
        sobrenome: sobrenome || null, 
        data_nascimento: data_nascimento || null, 
        nacionalidade: nacionalidade || null 
    };
    const token = localStorage.getItem('token');
    const url = `${API_URL}/autores/`;
    const containerId = 'author-create-form-container';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(authorData)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage(containerId, `✅ Autor "${result.nome} ${result.sobrenome || ''}" cadastrado com sucesso!`, false);
            form.reset();
            loadAuthorDeleteOptions(); 
            loadBookCreationData(); 
        } else {
            const errorMsg = extractApiErrorMessage(result);
            showMessage(containerId, `❌ Falha ao cadastrar autor: ${errorMsg}`, true);
        }
    } catch (error) {
        showMessage(containerId, 'Erro de conexão com a API ao cadastrar autor.', true);
        console.error("Erro ao criar autor:", error);
    }
}

// DELETE
async function loadAuthorDeleteOptions() {
    await fillSelect(
        `${API_URL}/autores`, 
        'delete-author-id', 
        'autor_id', 
        (item) => `${item.nome} ${item.sobrenome || ''} (ID: ${item.autor_id})`,
        'Selecione o Autor a Excluir'
    );
}

async function deleteAuthor(event) {
    event.preventDefault();
    const authorId = document.getElementById('delete-author-id').value;
    const token = localStorage.getItem('token');
    const url = `${API_URL}/autores/${authorId}`;
    const containerId = 'author-delete-form-container';

    const confirmed = await customConfirm(
        'Confirmar Exclusão', 
        `Tem certeza que deseja EXCLUIR o Autor ID ${authorId}? Esta ação é irreversível e pode falhar se houver livros vinculados.`,
        'EXCLUIR PERMANENTEMENTE'
    );
    if (!confirmed) return;

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 204) {
            showMessage(containerId, `✅ Autor ID ${authorId} excluído com sucesso!`, false);
            document.getElementById('delete-author-form').reset();
            loadAuthorDeleteOptions();
            loadBookCreationData(); 
        } else {
            const result = await response.json();
            const errorMsg = extractApiErrorMessage(result);
            showMessage(containerId, `❌ Falha ao excluir autor: ${errorMsg}`, true);
        }
    } catch (error) {
        showMessage(containerId, 'Erro de conexão com a API ao excluir autor.', true);
        console.error("Erro ao deletar autor:", error);
    }
}


// ----------------------------------------------------------------
// GERENCIAR LIVROS
// ----------------------------------------------------------------

// LOAD DATA for CREATE
async function loadBookCreationData() {
    const token = localStorage.getItem('token');
    
    // 1. Carrega Autores
    await fillSelect(
        `${API_URL}/autores`, 
        'book-autor-id', 
        'autor_id', 
        (item) => `${item.nome} ${item.sobrenome || ''}`,
        'Selecione um Autor'
    );

    // 2. Carrega Gêneros
    await fillSelect(
        `${API_URL}/generos`, 
        'book-generos-ids', 
        'genero_id', 
        'nome',
        'Carregando gêneros...'
    );
}

// CREATE
async function createBook(event) {
    event.preventDefault();

    const form = document.getElementById('create-book-form');
    const generosSelect = document.getElementById('book-generos-ids');
    const selectedGenres = Array.from(generosSelect.selectedOptions).map(option => parseInt(option.value));

    const bookData = {
        titulo: document.getElementById('book-titulo').value,
        isbn: document.getElementById('book-isbn').value,
        editora: document.getElementById('book-editora').value,
        ano_publicacao: parseInt(document.getElementById('book-ano-publicacao').value),
        numero_copias: parseInt(document.getElementById('book-numero-copias').value),
        autor_id: parseInt(document.getElementById('book-autor-id').value),
        lista_generos_ids: selectedGenres
    };
    
    const token = localStorage.getItem('token');
    const url = `${API_URL}/livros/`;
    const containerId = 'book-create-form-container';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(bookData)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage(containerId, `✅ Livro "${result.titulo}" cadastrado com sucesso!`, false);
            form.reset();
            loadBookDeleteOptions(); 
            loadLoanCreationData(); 
            loadBooks(document.getElementById('book-grid-admin'));
            loadSummaryData();
        } else {
            const errorMsg = extractApiErrorMessage(result);
            showMessage(containerId, `❌ Falha ao cadastrar livro: ${errorMsg}`, true);
        }
    } catch (error) {
        showMessage(containerId, 'Erro de conexão com a API ao cadastrar livro.', true);
        console.error("Erro ao criar livro:", error);
    }
}

// DELETE
async function loadBookDeleteOptions() {
    await fillSelect(
        `${API_URL}/livros`, 
        'delete-book-id', 
        'livro_id', 
        (item) => `${item.titulo} (ISBN: ${item.isbn})`,
        'Selecione o Livro a Excluir'
    );
}

async function deleteBook(event) {
    event.preventDefault();
    const bookId = document.getElementById('delete-book-id').value;
    const token = localStorage.getItem('token');
    
    // ATENÇÃO: A URL FOI ALTERADA PARA O NOVO ENDPOINT!
    const url = `${API_URL}/livros/${bookId}/com-emprestimos`; 
    const containerId = 'book-delete-form-container';

    const confirmed = await customConfirm(
        'Confirmar Exclusão Total', 
        `ATENÇÃO: Você irá EXCLUIR PERMANENTEMENTE o Livro ID ${bookId} E todos os seus registros de empréstimo. Esta ação só será permitida se TODOS os empréstimos estiverem como 'DEVOLVIDO'.`,
        'EXCLUIR TUDO'
    );
    if (!confirmed) return;

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 204) {
            // Sucesso (204 No Content)
            showMessage(containerId, `✅ Livro ID ${bookId} e empréstimos associados excluídos com sucesso!`, false);
            document.getElementById('delete-book-form').reset();
            
            // Recarregar todas as opções e listas afetadas
            loadBookDeleteOptions(); 
            loadBookCreationData(); 
            loadLoanCreationData(); 
            loadBooks(document.getElementById('book-grid-admin'));
            loadSummaryData();
        } else {
            const result = await response.json();
            const errorMsg = extractApiErrorMessage(result);
            
            // Tratamento específico para o erro de regra de negócio (Status 409 Conflict)
            if (response.status === 409) {
                showMessage(containerId, `❌ **Exclusão Bloqueada**: ${errorMsg}`, true);
            } else {
                showMessage(containerId, `❌ Falha ao excluir livro: ${errorMsg}`, true);
            }
        }
    } catch (error) {
        showMessage(containerId, 'Erro de conexão com a API ao excluir livro e empréstimos.', true);
        console.error("Erro ao deletar livro e empréstimos:", error);
    }
}


// ----------------------------------------------------------------
// GERENCIAR GÊNEROS (NOVO)
// ----------------------------------------------------------------

// CREATE
async function createGenre(event) {
    event.preventDefault();

    const nome = document.getElementById('genre-nome').value;
    const form = document.getElementById('create-genre-form');

    const genreData = { nome };
    const token = localStorage.getItem('token');
    const url = `${API_URL}/generos/`;
    const containerId = 'genre-create-form-container';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(genreData)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage(containerId, `✅ Gênero "${result.nome}" cadastrado com sucesso!`, false);
            form.reset();
            loadGenreDeleteOptions(); 
            loadBookCreationData(); 
        } else {
            const errorMsg = extractApiErrorMessage(result);
            showMessage(containerId, `❌ Falha ao cadastrar gênero: ${errorMsg}`, true);
        }
    } catch (error) {
        showMessage(containerId, 'Erro de conexão com a API ao cadastrar gênero.', true);
        console.error("Erro ao criar gênero:", error);
    }
}

// DELETE
async function loadGenreDeleteOptions() {
    await fillSelect(
        `${API_URL}/generos`, 
        'delete-genre-id', 
        'genero_id', 
        'nome',
        'Selecione o Gênero a Excluir'
    );
}

async function deleteGenre(event) {
    event.preventDefault();
    const genreId = document.getElementById('delete-genre-id').value;
    const token = localStorage.getItem('token');
    const url = `${API_URL}/generos/${genreId}`;
    const containerId = 'genre-delete-form-container';

    const confirmed = await customConfirm(
        'Confirmar Exclusão', 
        `Tem certeza que deseja EXCLUIR o Gênero ID ${genreId}? Esta ação é irreversível e pode falhar se houver livros vinculados.`,
        'EXCLUIR PERMANENTEMENTE'
    );
    if (!confirmed) return;

    try {
        const response = await fetch(url, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 204) {
            showMessage(containerId, `✅ Gênero ID ${genreId} excluído com sucesso!`, false);
            document.getElementById('delete-genre-form').reset();
            loadGenreDeleteOptions();
            loadBookCreationData(); 
        } else {
            const result = await response.json();
            const errorMsg = extractApiErrorMessage(result);
            showMessage(containerId, `❌ Falha ao excluir gênero: ${errorMsg}`, true);
        }
    } catch (error) {
        showMessage(containerId, 'Erro de conexão com a API ao excluir gênero.', true);
        console.error("Erro ao deletar gênero:", error);
    }
}


// ----------------------------------------------------------------
// GERENCIAR EMPRÉSTIMOS
// ----------------------------------------------------------------

// LOAD DATA for CREATE/FILTER
async function loadLoanCreationData() {
    const token = localStorage.getItem('token');

    // 1. Carrega Leitores (para criação e filtro)
    await fillSelect(
        `${API_URL}/usuarios/leitores/`, 
        'loan-leitor-id', 
        'usuario_id', 
        (item) => `${item.nome || ''} ${item.sobrenome || ''}`.trim(),
        'Selecione um Leitor'
    );
    await fillSelect(
        `${API_URL}/usuarios/leitores/`, 
        'filter-leitor-id', 
        'usuario_id', 
        (item) => `${item.nome || ''} ${item.sobrenome || ''}`.trim(),
        'Todos os Leitores'
    );

    // 2. Carrega Livros (apenas disponíveis para criação)
    await fillSelect(
        `${API_URL}/livros/estoque/`, 
        'loan-book-id', 
        'livro_id', 
        (item) => `${item.titulo} (Estoque: ${item.numero_copias || 1})`,
        'Selecione um Livro'
    );
    
    // Define a data mínima para devolução (hoje)
    document.getElementById('loan-data-devolucao').setAttribute('min', TODAY);
}

// CREATE
async function createLoan(event) {
    event.preventDefault();

    if (!BIBLIOTECARIO_ID) {
        showMessage('loan-create-form-container', '❌ Erro: ID do Bibliotecário não encontrado. Faça login novamente.', true);
        return;
    }

    const form = document.getElementById('create-loan-form');
    const loanData = {
        livro_id: parseInt(document.getElementById('loan-book-id').value),
        leitor_id: parseInt(document.getElementById('loan-leitor-id').value), 
        bibliotecario_id: BIBLIOTECARIO_ID, 
        data_devolucao_prevista: document.getElementById('loan-data-devolucao').value + 'T00:00:00.000Z' 
    };
    
    const token = localStorage.getItem('token');
    const url = `${API_URL}/emprestimos/`;
    const containerId = 'loan-create-form-container';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(loanData)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage(containerId, `✅ Empréstimo registrado com sucesso!`, false);
            form.reset();
            
            // 1. Recarrega o resumo
            loadSummaryData(); 
            // 2. Recarrega os dropdowns (remove o livro do estoque)
            loadLoanCreationData(); 
            // 3. 🚨 CORREÇÃO: Limpa o cache para forçar a busca do novo item na API!
            activeLoansCache = []; 
            loadActiveLoansAdmin({}); 
            
        } else {
            const errorMsg = extractApiErrorMessage(result);
            showMessage(containerId, `❌ Falha ao registrar empréstimo: ${errorMsg}`, true);
        }
    } catch (error) {
        showMessage(containerId, 'Erro de conexão com a API ao registrar empréstimo.', true);
        console.error("Erro ao criar empréstimo:", error);
    }
}

// READ/FILTER
async function loadActiveLoansAdmin(filters = {}) {
    const loansList = document.getElementById('loans-list');
    if (!loansList) return;

    loansList.innerHTML = '<p class="loading-message">Carregando empréstimos...</p>';

    const token = localStorage.getItem('token');
    
    const leitorIdFiltro = filters.leitor_id;
    let url = `${API_URL}/emprestimos/`; 
    if (leitorIdFiltro) {
        url = `${API_URL}/emprestimos/leitor/${leitorIdFiltro}`; 
    }
    
    // Lógica de cache: Se mudou de leitor ou o cache foi limpo, recarrega da API
    const shouldReloadFromApi = activeLoansCache.length === 0 || activeLoansCache.__url !== url;

    try {
        if (shouldReloadFromApi) {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });

            const emprestimos = await response.json();
            
            if (!response.ok) {
                 if (response.status === 404 && emprestimos.detail && emprestimos.detail.includes("Empréstimo não encontrado")) {
                     loansList.innerHTML = '<p class="empty-message">Nenhum empréstimo encontrado para os critérios de busca.</p>';
                     activeLoansCache = []; 
                     return; 
                 }
                 loansList.innerHTML = `<p class="error-message">Erro ao carregar empréstimos: ${emprestimos.detail || 'Falha na API'}</p>`;
                 activeLoansCache = []; 
                 return;
            }

            activeLoansCache = emprestimos;
            activeLoansCache.__url = url; 
        }
        
        // Aplica filtros remanescentes (Data e Status)
        const filteredLoans = applyLoanFilters(activeLoansCache, filters);
        renderLoans(filteredLoans, loansList);

    } catch (error) {
        console.error('Erro de conexão ao buscar empréstimos:', error);
        loansList.innerHTML = '<p class="error-message">Falha de conexão com a API.</p>';
    }
}

function applyLoanFilters(loans, filters) {
    let filtered = loans;
    
    // Filtro de Data
    const dataPrevista = filters.data_devolucao ? new Date(filters.data_devolucao) : null;
    if (dataPrevista) dataPrevista.setHours(23, 59, 59, 999); 
    
    const statusFiltro = filters.status;

    // 1. Filtro por Data (Se houver)
    if (dataPrevista) {
        filtered = filtered.filter(loan => {
            const loanDate = new Date(loan.data_devolucao_prevista);
            return loanDate <= dataPrevista; 
        });
    }
    
    // 2. Filtro por Status (Lógica Ajustada para valores da API)
    if (statusFiltro) {
        const hoje = new Date();
        hoje.setHours(0,0,0,0);
        
        filtered = filtered.filter(loan => {
            const dataDevolucao = new Date(loan.data_devolucao_prevista);
            dataDevolucao.setHours(0,0,0,0);
            
            const apiStatus = (loan.status_emprestimo || '').toLowerCase(); 

            const isAtivo = apiStatus === 'emprestado'; 
            const isOverdue = isAtivo && (dataDevolucao < hoje);
            const isDevolvido = apiStatus === 'devolvido' || apiStatus === 'finalizado';

            if (statusFiltro === "Atrasado") {
                return isOverdue;
                
            } else if (statusFiltro === "Devolvido") {
                return isDevolvido; 
                
            } else if (statusFiltro === "Emprestado") {
                // Filtra APENAS os emprestados ATIVOS que NÃO estão atrasados (Em dia)
                return isAtivo && !isOverdue;
            }

            return true;
        });
    }

    return filtered;
}

async function renderLoans(emprestimos, loansList) {
    loansList.innerHTML = '';

    if (emprestimos.length === 0) {
        loansList.innerHTML = '<p class="empty-message">Nenhum empréstimo que corresponda aos filtros.</p>';
        return;
    }

    // Criamos um mapa para buscar detalhes de livros e leitores apenas uma vez
    const detailsMap = {};
    const getDetails = async (id, type) => {
        const key = `${type}_${id}`;
        if (!detailsMap[key]) {
            if (type === 'livro') {
                detailsMap[key] = await fetchLivroDetails(id);
            } else if (type === 'leitor') {
                detailsMap[key] = await fetchLeitorDetails(id);
            }
        }
        return detailsMap[key];
    };

    const renderPromises = emprestimos.map(async emprestimo => {
        const card = document.createElement('div');
        card.classList.add('loan-card');
        
        const apiStatus = (emprestimo.status_emprestimo || '').toLowerCase();
        
        // OBTENÇÃO DE DADOS EXTRAS
        const livroTitulo = await getDetails(emprestimo.livro_id, 'livro');
        const leitorNome = await getDetails(emprestimo.leitor_id, 'leitor');

        const dataDevolucaoPrevista = new Date(emprestimo.data_devolucao_prevista);
        const hoje = new Date();
        hoje.setHours(0,0,0,0);
        dataDevolucaoPrevista.setHours(0,0,0,0);

        // CÁLCULO DE STATUS E CLASSES
        const isDevolvido = apiStatus === 'devolvido' || apiStatus === 'finalizado';
        const isAtivo = apiStatus === 'emprestado'; 
        const isOverdue = isAtivo && (dataDevolucaoPrevista < hoje);
        
        let statusDisplay = '';
        let dueDateClass = '';
        
        let dataLabel = 'Previsão de Devolução';
        let dataToDisplay = dataDevolucaoPrevista;

        if (isDevolvido) {
            dataLabel = 'Data de Devolução';
            dataToDisplay = emprestimo.data_devolucao_real ? new Date(emprestimo.data_devolucao_real) : dataDevolucaoPrevista;
            
            card.classList.add('returned');
            dueDateClass = 'returned-date';
            statusDisplay = `<p class="loan-status-returned"><i class="fas fa-check-circle"></i> DEVOLVIDO</p>`;
        } else if (isOverdue) {
            dueDateClass = 'overdue';
            card.classList.add('overdue-card');
            statusDisplay = `<p class="overdue-message">⚠️ ATRASADO!</p>`;
        } else {
            dueDateClass = 'in-time';
            statusDisplay = `<p class="in-time-message">✅ EM DIA</p>`;
        }
        
        const dataDisplayStr = dataToDisplay.toLocaleDateString('pt-BR');
        
        // CONTEÚDO E BOTÃO CONDICIONAL
        const finishButton = !isDevolvido 
            ? `<button class="btn-finish-loan" data-id="${emprestimo.emprestimo_id}"><i class="fas fa-undo-alt"></i> Finalizar Empréstimo</button>`
            : '';

        card.innerHTML = `
            <h3>${livroTitulo}</h3>
            <p><strong>Leitor:</strong> ${leitorNome}</p>
            <p><strong>Empréstimo ID:</strong> ${emprestimo.emprestimo_id}</p>
            
            <p><strong>${dataLabel}:</strong> <span class="due-date ${dueDateClass}">${dataDisplayStr}</span></p>
            
            ${statusDisplay}
            ${finishButton}
        `;
        loansList.appendChild(card);
        
        // Adiciona listener se o botão existir
        if (!isDevolvido) {
            card.querySelector('.btn-finish-loan').addEventListener('click', (e) => {
                const loanId = e.currentTarget.getAttribute('data-id');
                handleFinishLoan(loanId);
            });
        }
    });

    await Promise.all(renderPromises);
}

// UPDATE (Finalizar/Devolver)
async function handleFinishLoan(loanId) {
    const token = localStorage.getItem('token');
    const bibliotecarioId = localStorage.getItem('user_id'); 
    const containerId = 'loan-create-form-container'; 
    
    if (!bibliotecarioId) {
        showMessage(containerId, '❌ Erro: ID do Bibliotecário não encontrado. Faça login novamente.', true);
        return;
    }
    
    // Rota API: /emprestimos/{emprestimo_id}/devolver
    const url = `${API_URL}/emprestimos/${loanId}/devolver`; 
    
    const confirmed = await customConfirm(
        'Confirmar Devolução', 
        `Confirma a devolução do Empréstimo ID ${loanId}?`, 
        'CONFIRMAR DEVOLUÇÃO'
    );

    if (!confirmed) {
        return;
    }

    // Corpo JSON corrigido para o DevolucaoSchema
    const bodyData = { 
        bibliotecario_devolucao_id: parseInt(bibliotecarioId),
        data_devolucao_real: new Date().toISOString() 
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bodyData)
        });

        const result = await response.json(); 

        if (response.ok) {
            // MENSAGEM DE SUCESSO CUSTOMIZADA
            showMessage(containerId, `✅ Empréstimo ID ${loanId} finalizado com sucesso!`, false);
            
            // 1. Recarrega o resumo
            loadSummaryData();
            // 2. Recarrega os dropdowns (coloca o livro de volta no estoque)
            loadLoanCreationData(); 
            // 3. 🚨 CORREÇÃO PRINCIPAL: Limpa o cache para forçar a busca de dados novos
            activeLoansCache = []; 
            loadActiveLoansAdmin({}); 

        } else {
            // MENSAGEM DE ERRO CUSTOMIZADA
            const errorMsg = extractApiErrorMessage(result);
            showMessage(containerId, `❌ Falha ao finalizar empréstimo: ${errorMsg}`, true);
            console.error('Detalhe do erro API:', result);
        }

    } catch (error) {
        console.error('Erro de rede ao finalizar empréstimo:', error);
        showMessage(containerId, '❌ Erro de conexão ao tentar finalizar o empréstimo.', true);
    }
}


// ----------------------------------------------------------------
// CATÁLOGO DE CONSULTA (Admin)
// ----------------------------------------------------------------

async function fetchAuthorDetails(autorId) {
    const token = localStorage.getItem('token');
    const url = `${API_URL}/autores/${autorId}`; 
    try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        const autorObj = Array.isArray(data) ? data[0] : data; 
        return (autorObj && autorObj.nome) ? `${autorObj.nome} ${autorObj.sobrenome || ''}`.trim() : 'Autor Desconhecido';
    } catch (error) {
        return 'Erro de Conexão';
    }
}

/**
 * Carrega e exibe os livros no catálogo de consulta (Admin).
 */
async function loadBooks(gridElement) {
    if (!gridElement) return;

    gridElement.innerHTML = '<p class="loading-message">Carregando livros...</p>';

    const token = localStorage.getItem('token');
    const url = `${API_URL}/livros`; 

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        const livros = await response.json();
        gridElement.innerHTML = '';

        if (!response.ok) {
            gridElement.innerHTML = `<p class="error-message">Erro: ${livros.detail || 'Falha na API'}</p>`;
            return;
        }

        if (livros.length === 0) {
            gridElement.innerHTML = '<p class="empty-message">Nenhum livro encontrado.</p>';
            return;
        }

        const renderPromises = livros.map(async livro => {
            const nomeAutor = await fetchAuthorDetails(livro.autor_id);
            const card = document.createElement('div');
            card.classList.add('book-card');
            card.innerHTML = `
                <div class="book-card-header">
                    <h3>${livro.titulo}</h3>
                    <span class="book-year">${livro.ano_publicacao}</span>
                </div>
                <div class="book-card-body">
                    <p><strong>Autor:</strong> ${nomeAutor}</p>
                    <p><strong>Editora:</strong> ${livro.editora || 'N/A'}</p>
                    <p><strong>ISBN:</strong> <span class="isbn">${livro.isbn}</span></p>
                    <p><strong>Cópias:</strong> ${livro.numero_copias}</p>
                </div>
            `;
            gridElement.appendChild(card);
        });

        await Promise.all(renderPromises);

    } catch (error) {
        gridElement.innerHTML = '<p class="error-message">Falha de conexão com a API.</p>';
    }
}

/**
 * Busca o nome do Leitor (Usuário) pelo ID.
 * Rota API: GET /usuarios/{usuario_id}
 */
async function fetchLeitorDetails(leitorId) {
    const token = localStorage.getItem('token');
    // URL CORRETA: Utiliza o prefixo /usuarios/
    const url = `${API_URL}/usuarios/${leitorId}`; 
    try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        
        if (!response.ok || !data) {
             return `Leitor ID: ${leitorId}`;
        }
        
        return `${data.nome || ''} ${data.sobrenome || ''}`.trim() || `Leitor ID: ${leitorId}`;
        
    } catch (error) {
        return `Erro Leitor ID: ${leitorId}`;
    }
}

/**
 * Busca o título do Livro pelo ID.
 * Rota API: GET /livros/{livro_id}
 */
async function fetchLivroDetails(livroId) {
    const token = localStorage.getItem('token');
    // URL CORRETA: Utiliza o prefixo /livros/
    const url = `${API_URL}/livros/${livroId}`; 
    try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        
        if (!response.ok || !data) {
             return 'Título Desconhecido';
        }
        
        return data.titulo || 'Título Desconhecido';
        
    } catch (error) {
        return 'Erro de Conexão (Livro)';
    }
}


// ----------------------------------------------------------------
// DASHBOARD HOME
// ----------------------------------------------------------------

/**
 * Carrega dados de resumo para a tela Home do Dashboard.
 */
async function loadSummaryData() {
    const token = localStorage.getItem('token');
    
    // Total de Livros (Soma do número de cópias)
    try {
        const response = await fetch(`${API_URL}/livros`, { headers: { 'Authorization': `Bearer ${token}` } });
        const livros = await response.json();
        let totalCopias = 0;
        if (Array.isArray(livros)) {
            totalCopias = livros.reduce((sum, livro) => sum + (livro.numero_copias || 0), 0);
        }
        document.getElementById('total-books').textContent = totalCopias.toLocaleString();
    } catch (e) {
        document.getElementById('total-books').textContent = '...';
    }

    // Leitores Ativos (Total de leitores cadastrados)
    try {
        const response = await fetch(`${API_URL}/usuarios/leitores/`, { headers: { 'Authorization': `Bearer ${token}` } });
        const leitores = await response.json();
        document.getElementById('active-readers').textContent = Array.isArray(leitores) ? leitores.length : '...';
    } catch (e) {
        document.getElementById('active-readers').textContent = '...';
    }

    // Empréstimos Atrasados (Reutiliza a lógica do cache de empréstimos)
    try {
        const response = await fetch(`${API_URL}/emprestimos/`, { headers: { 'Authorization': `Bearer ${token}` } });
        const allLoans = await response.json();
        
        if (response.ok && Array.isArray(allLoans)) {
            // Filtra APENAS os empréstimos ativos (status_emprestimo = 'Emprestado')
            const activeLoans = allLoans.filter(loan => (loan.status_emprestimo || '').toLowerCase() === 'emprestado');
            
            const overdueCount = activeLoans.filter(loan => {
                const dataDevolucao = new Date(loan.data_devolucao_prevista);
                const hoje = new Date();
                hoje.setHours(0,0,0,0);
                dataDevolucao.setHours(0,0,0,0);
                return dataDevolucao < hoje;
            }).length;
            document.getElementById('overdue-loans').textContent = overdueCount;
        } else {
             document.getElementById('overdue-loans').textContent = '0';
        }
    } catch (e) {
        document.getElementById('overdue-loans').textContent = '...';
    }
}


// ----------------------------------------------------------------
// LÓGICA DE INICIALIZAÇÃO DA PÁGINA (DOMContentLoaded)
// ----------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // 1. CARREGAR DADOS DO USUÁRIO E ID
    const userName = localStorage.getItem('user_name'); 
    const userIdString = localStorage.getItem('user_id'); 
    const userNameElement = document.getElementById('user-name');
    const userAvatarElement = document.getElementById('user-avatar-initial');

    if (userIdString) {
        BIBLIOTECARIO_ID = parseInt(userIdString);
    }

    if (userName && userNameElement && userAvatarElement) {
        userNameElement.textContent = userName;
        userAvatarElement.textContent = userName.charAt(0).toUpperCase();
    } else {
        userNameElement.textContent = 'Bibliotecário';
        userAvatarElement.textContent = 'B';
    }

    // 2. CONFIGURAR NAVEGAÇÃO DA SIDEBAR
    document.querySelectorAll('.main-menu .menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const sectionId = item.getAttribute('data-section');
            if (sectionId) {
                activateSection(sectionId);
            }
        });
    });

    // 3. Lógica de Logout
    document.getElementById('logout-button')?.addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_name');
        localStorage.removeItem('user_id');
        // Redirecionar para a tela de login (ajuste o caminho se necessário)
        window.location.href = '../skeleton/index.html'; 
    });

    // 4. CONFIGURAR SUBMISSÕES DE FORMULÁRIO (CREATE/DELETE)
    document.getElementById('create-author-form')?.addEventListener('submit', createAuthor);
    document.getElementById('delete-author-form')?.addEventListener('submit', deleteAuthor);

    document.getElementById('create-book-form')?.addEventListener('submit', createBook);
    document.getElementById('delete-book-form')?.addEventListener('submit', deleteBook);
    
    document.getElementById('create-genre-form')?.addEventListener('submit', createGenre);
    document.getElementById('delete-genre-form')?.addEventListener('submit', deleteGenre);

    document.getElementById('create-loan-form')?.addEventListener('submit', createLoan);

    // 5. CONFIGURAR FILTROS DE EMPRÉSTIMO
    document.getElementById('apply-loan-filters')?.addEventListener('click', () => {
        const filters = {
            leitor_id: document.getElementById('filter-leitor-id').value,
            data_devolucao: document.getElementById('filter-data-devolucao').value,
            status: document.getElementById('filter-status').value
        };
        // Carrega do cache e aplica os filtros
        loadActiveLoansAdmin(filters); 
    });


    // 6. CARREGAR DADOS INICIAIS DA HOME
    loadSummaryData();
    // Ativa a seção inicial
    activateSection('dashboard-home'); 
});