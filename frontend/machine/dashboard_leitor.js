// -------------------------------
// CONFIGURAÇÃO DA API E ESTADO GLOBAL
// -------------------------------
const API_URL = "http://127.0.0.1:8000";
let GENERO_ATIVO_ID = ""; // Armazena o ID do gênero atualmente selecionado
let LEITOR_ID = null; // ID do leitor logado, necessário para carregar empréstimos
let leitorLoansCache = [];

// ----------------------------------------------------------------
// NOVAS FUNÇÕES DE FILTRO (BASEADAS NO DASHBOARD DO BIBLIOTECÁRIO)
// ----------------------------------------------------------------

/**
 * Aplica filtros locais (Status e Data) à lista de empréstimos em cache.
 * @param {Array} loans - Lista de empréstimos do leitor.
 * @param {Object} filters - Objeto contendo { startDate, endDate, status }.
 * @returns {Array} Lista de empréstimos filtrada.
 */
function applyLeitorLoanFilters(loans, filters) {
    let filtered = loans;

    // Filtro de Data (Início e Fim)
    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;

    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const statusFiltro = filters.status;

    // 1. Filtro por Data
    if (startDate || endDate) {
        filtered = filtered.filter(loan => {
            const loanDate = new Date(loan.data_emprestimo);
            loanDate.setHours(0, 0, 0, 0);

            const matchesStart = startDate ? loanDate >= startDate : true;
            const matchesEnd = endDate ? loanDate <= endDate : true;

            return matchesStart && matchesEnd;
        });
    }

    // 2. Filtro por Status
    if (statusFiltro && statusFiltro !== "") {
        filtered = filtered.filter(loan => {
            // 🚨 NOVO: isOverdue vem diretamente da API
            const isOverdue = loan.is_atrasado; 
            const apiStatus = (loan.status_emprestimo || '').toLowerCase();
            const isEmprestado = apiStatus === 'emprestado';
            const isDevolvido = apiStatus === 'devolvido';

            if (statusFiltro === "Atrasado") {
                return isOverdue;
            } else if (statusFiltro === "Devolvido") {
                return isDevolvido;
            } else if (statusFiltro === "Emprestado") {
                // Emprestado (Ativos) = Emprestado E não Atrasado (Em dia)
                return isEmprestado && !isOverdue; 
            }
            // Se "Todos os Status" ou status desconhecido, retorna tudo
            return true;
        });
    }

    return filtered;
}

// ----------------------------------------------------------------
// NOVAS FUNÇÕES DE BUSCA DE DETALHES DO LIVRO E AUTOR
// ----------------------------------------------------------------

/**
 * Busca o nome completo de um autor.
 * @param {number} autorId - ID do autor.
 * @returns {Promise<string>} Nome completo do autor ou uma string de erro.
 */
async function fetchAuthorName(autorId) {
    const token = localStorage.getItem('token');
    const url = `${API_URL}/autores/${autorId}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        // A sua rota retorna uma lista (response_model=list[AutorResponseSchema])
        const data = await response.json();
        const autorObj = Array.isArray(data) && data.length > 0 ? data[0] : data;

        if (response.ok && autorObj && autorObj.nome) {
            const nomeCompleto = `${autorObj.nome} ${autorObj.sobrenome || ''}`.trim();
            return nomeCompleto || 'Autor (Nome Ausente)';
        }
        return 'Autor Desconhecido';

    } catch (error) {
        console.error(`Falha de conexão ao buscar autor ${autorId}:`, error);
        return 'Erro de Conexão (Autor)';
    }
}

/**
 * Busca os detalhes de um livro pelo ID.
 * @param {number} livroId - ID do livro.
 * @returns {Promise<Object>} Um objeto contendo { titulo, autor_id } ou um objeto de erro.
 */
async function fetchBookDetails(livroId) {
    const token = localStorage.getItem('token');
    const url = `${API_URL}/livros/${livroId}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        const livro = await response.json();

        if (response.ok && livro && livro.titulo && livro.autor_id) {
            return {
                titulo: livro.titulo,
                autor_id: livro.autor_id
            };
        }
        return { titulo: `Livro ID ${livroId} (Título Ausente)`, autor_id: null };

    } catch (error) {
        console.error(`Falha de conexão ao buscar livro ${livroId}:`, error);
        return { titulo: `Livro ID ${livroId} (Erro de Conexão)`, autor_id: null };
    }
}

// ----------------------------------------------------------------
// FUNÇÕES DE EXIBIÇÃO DE CONTEÚDO E BUSCA (AJUSTADAS)
// ----------------------------------------------------------------

// A função fetchAuthorDetails (antiga) foi substituída por fetchAuthorName, mas
// a função loadBooks ainda precisa dela para o catálogo. Mantenha a versão
// antiga por compatibilidade com loadBooks, mas use a nova lógica na renderização.
async function fetchAuthorDetails(autorId) {
    const nomeCompleto = await fetchAuthorName(autorId);
    return nomeCompleto;
}


/**
 * Função principal para buscar e exibir os livros no catálogo.
 * (Não houve alteração aqui, apenas uma correção no fetchAuthorDetails acima)
 */
async function loadBooks(searchQuery = '', generoId = GENERO_ATIVO_ID) {
    const bookGrid = document.getElementById('book-grid');
    if (!bookGrid) return;

    bookGrid.innerHTML = '<p class="loading-message">Carregando livros...</p>';

    let url = `${API_URL}/livros?`;
    const token = localStorage.getItem('token');

    if (generoId) {
        url += `genero=${encodeURIComponent(generoId)}&`;
    }
    if (searchQuery) {
        url += `search=${encodeURIComponent(searchQuery)}&`;
    }
    url = url.slice(-1) === '&' ? url.slice(0, -1) : url;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        const livros = await response.json();
        bookGrid.innerHTML = '';

        if (!response.ok) {
            bookGrid.innerHTML = `<p class="error-message">Erro ao carregar catálogo: ${livros.detail || 'Falha na API'}</p>`;
            return;
        }

        if (livros.length === 0) {
            bookGrid.innerHTML = '<p class="empty-message">Nenhum livro encontrado no catálogo.</p>';
            return;
        }

        await renderBooksInCards(bookGrid, livros);

    } catch (error) {
        console.error('Erro de conexão ao buscar livros/autores:', error);
        bookGrid.innerHTML = '<p class="error-message">Falha de conexão com a API.</p>';
    }
}

/**
 * Renderiza os livros como cards no grid (apenas consulta).
 * (Nenhuma alteração de lógica necessária aqui, pois fetchAuthorDetails foi ajustada)
 */
async function renderBooksInCards(gridElement, livros) {
    const renderPromises = livros.map(async livro => {
        const nomeAutor = await fetchAuthorDetails(livro.autor_id);

        // Simulação de gênero para exibição, pois o endpoint /livros não retorna o nome do gênero diretamente
        const generoNome = "Gênero Desconhecido";

        const card = document.createElement('div');
        card.classList.add('book-card');
        card.innerHTML = `
            <div class="book-card-header">
                <h3>${livro.titulo}</h3>
                <span class="book-year">${livro.ano_publicacao}</span>
            </div>
            <div class="book-card-body">
                <p><strong>Autor:</strong> ${nomeAutor}</p>
                <p><strong>Gênero:</strong> ${generoNome}</p>
                <p><strong>ISBN:</strong> <span class="isbn">${livro.isbn}</span></p>
            </div>
        `;
        gridElement.appendChild(card);
    });

    await Promise.all(renderPromises);
}

/**
 * Carrega todos os empréstimos do leitor (se não estiver em cache) e aplica filtros.
 * @param {Object} filters - Objeto contendo { startDate, endDate, status }.
 */
async function loadActiveLoans(filters = {}) {
    const loansList = document.getElementById('loans-list');
    if (!loansList) return;

    loansList.innerHTML = '<p class="loading-message">Carregando empréstimos...</p>';

    if (!LEITOR_ID) {
        loansList.innerHTML = '<p class="error-message">Erro: ID do Leitor não encontrado. Por favor, faça login novamente.</p>';
        return;
    }

    const url = `${API_URL}/emprestimos/leitor/${LEITOR_ID}`;
    const token = localStorage.getItem('token');

    // Se o cache estiver vazio, recarrega TUDO da API
    if (leitorLoansCache.length === 0) {
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });

            if (response.status === 404) {
                loansList.innerHTML = '<p class="empty-message">Nenhum empréstimo encontrado.</p>';
                leitorLoansCache = [];
                return;
            }

            const emprestimos = await response.json();

            if (!response.ok) {
                loansList.innerHTML = `<p class="error-message">Erro ao carregar empréstimos: ${emprestimos.detail || 'Falha na API'}</p>`;
                leitorLoansCache = [];
                return;
            }

            // Armazena todos os empréstimos do leitor no cache
            leitorLoansCache = emprestimos;

        } catch (error) {
            console.error('Erro de conexão ao buscar empréstimos:', error);
            loansList.innerHTML = '<p class="error-message">Falha de conexão com a API.</p>';
            return;
        }
    }

    // Aplica filtros ao cache e renderiza
    const filteredLoans = applyLeitorLoanFilters(leitorLoansCache, filters);

    // Reutiliza a lógica de renderização
    await renderLeitorLoans(filteredLoans, loansList);
}

/**
 * Renderiza os empréstimos na tela do leitor (Adaptada de loadActiveLoans original).
 * É renomeada para evitar conflitos de escopo e manter a clareza.
 */
async function renderLeitorLoans(emprestimos, loansList) {
    loansList.innerHTML = '';

    if (emprestimos.length === 0) {
        loansList.innerHTML = '<p class="empty-message">Nenhum empréstimo que corresponda aos filtros.</p>';
        return;
    }

    const renderPromises = emprestimos.map(async emprestimo => {
        // 1. Buscar detalhes do Livro (Título e autor_id)
        const bookDetails = await fetchBookDetails(emprestimo.livro_id);
        const livroTitulo = bookDetails.titulo;

        // 2. Buscar Nome do Autor
        let autorNome = 'Autor Desconhecido';
        if (bookDetails.autor_id) {
            autorNome = await fetchAuthorName(bookDetails.autor_id);
        }

        // Formatação das datas
        const dataEmprestimo = new Date(emprestimo.data_emprestimo).toLocaleDateString('pt-BR');
        const dataDevolucaoRef = emprestimo.data_devolucao_real || emprestimo.data_devolucao_prevista;
        const dataDisplay = new Date(dataDevolucaoRef).toLocaleDateString('pt-BR');

        // --- Lógica de Status (baseada na API) ---
        const apiStatus = (emprestimo.status_emprestimo || '').toLowerCase();
        // 🚨 NOVO: isOverdue vem diretamente da API
        const isOverdue = emprestimo.is_atrasado; 

        const isEmprestado = apiStatus === 'emprestado';
        const isDevolvido = apiStatus === 'devolvido';

        let statusText = '';
        let dueDateClass = '';
        let dataLabel = isDevolvido ? 'Devolvido em' : 'Previsão de Devolução';

        if (isDevolvido) {
            dueDateClass = 'returned'; 
            statusText = '<p style="color: var(--secondary-text); font-weight: 600;">✅ DEVOLVIDO</p>';
        } else if (isEmprestado) {
            // 🚨 USANDO isOverdue DIRETAMENTE
            if (isOverdue) {
                dueDateClass = 'overdue';
                statusText = '<p class="overdue-message" style="color: var(--error-red); font-weight: 600;">⚠️ ATRASADO!</p>';
            } else {
                dueDateClass = 'in-time'; 
                statusText = '<p style="color: var(--success-green); font-weight: 600;">✅ EM DIA</p>';
            }
        }

        const card = document.createElement('div');
        card.classList.add('loan-card');

        card.innerHTML = `
            <h3>${livroTitulo}</h3>
            <p><strong>Autor:</strong> ${autorNome}</p>
            <p><strong>Emprestado em:</strong> ${dataEmprestimo}</p>
            <p><strong>${dataLabel}:</strong> <span class="due-date ${dueDateClass}">${dataDisplay}</span></p>
            ${statusText}
        `;
        loansList.appendChild(card);
    });

    await Promise.all(renderPromises);
}

// ----------------------------------------------------------------
// FUNÇÕES DE GÊNEROS DINÂMICOS (SEM ALTERAÇÃO)
// ----------------------------------------------------------------

/**
 * Cria um link para filtrar por gênero.
 * @param {string} nome - Nome do gênero.
 * @param {string} id - ID do gênero.
 * @param {HTMLElement} listElement - O elemento <ul> onde o link será adicionado.
 * @returns {HTMLElement} O elemento <li> com o link do gênero.
 */
function createGenreFilterLink(nome, id, listElement) {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = "#";
    a.innerText = nome;
    a.setAttribute('data-genre-id', id);

    a.addEventListener('click', (e) => {
        e.preventDefault();
        const selectedGenreId = a.getAttribute('data-genre-id');
        GENERO_ATIVO_ID = selectedGenreId;

        listElement.querySelectorAll('a').forEach(link => link.classList.remove('active'));
        a.classList.add('active');

        loadBooks('', selectedGenreId);
        // Garante que a seção do catálogo esteja ativa ao filtrar
        activateSection('catalogo-section');
    });

    li.appendChild(a);
    return li;
}

/**
 * Carrega e exibe a lista de gêneros na sidebar.
 */
async function loadGenres() {
    const list = document.querySelector('.genre-list');
    if (!list) return;

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_URL}/generos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) {
            throw new Error('Falha ao carregar lista de gêneros');
        }

        const generos = await response.json();

        list.innerHTML = '';

        // Adiciona a opção "Todos os Livros"
        const linkTodos = createGenreFilterLink('Todos os Livros', '', list);
        list.appendChild(linkTodos);

        generos.forEach(genero => {
            const link = createGenreFilterLink(genero.nome, genero.genero_id, list);
            list.appendChild(link);
        });

        // Ativa o filtro "Todos os Livros" ao carregar e inicia o catálogo
        const todosLink = list.querySelector('a[data-genre-id=""]');
        if (todosLink) {
            todosLink.classList.add('active');
            GENERO_ATIVO_ID = "";
            loadBooks('', "");
        }

    } catch (error) {
        console.error('Erro ao carregar gêneros:', error);
        list.innerHTML = `<li><a href="#" style="color:var(--error-red);">Erro ao carregar gêneros.</a></li>`;
    }
}

// ----------------------------------------------------------------
// LÓGICA DE INTERAÇÃO DA UI (ATIVAÇÃO DE SEÇÕES, ETC.) (SEM ALTERAÇÃO)
// ----------------------------------------------------------------

/**
 * Ativa uma seção de conteúdo específica e desativa as outras.
 * @param {string} sectionId - O ID da seção a ser ativada (ex: 'catalogo-section').
 */
function activateSection(sectionId) {
    // Desativa todas as seções
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    // Ativa a seção solicitada
    document.getElementById(sectionId).classList.add('active');

    // Atualiza o estado "active" na sidebar
    document.querySelectorAll('.main-menu .menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
        }
    });

    // Se for a seção de empréstimos, carrega os dados
    if (sectionId === 'emprestimos-section' && LEITOR_ID) {
        // Limpa o cache e força a busca de TODOS os empréstimos do leitor na API
        leitorLoansCache = [];
        // Chama com o filtro padrão (Emprestado)
        loadActiveLoans({ status: 'Emprestado' });
    }
}

// ----------------------------------------------------------------
// LÓGICA DE INICIALIZAÇÃO DA PÁGINA (DOMContentLoaded) (AJUSTADA)
// ----------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // 1. CARREGAR DADOS DO USUÁRIO E ID
    const userName = localStorage.getItem('user_name');
    const userIdString = localStorage.getItem('user_id');
    const userNameElement = document.getElementById('user-name');
    const userAvatarElement = document.getElementById('user-avatar-initial');

    if (userIdString) {
        LEITOR_ID = parseInt(userIdString);
    }

    if (userName && userNameElement && userAvatarElement) {
        userNameElement.textContent = userName;
        userAvatarElement.textContent = userName.charAt(0).toUpperCase();
    } else {
        userNameElement.textContent = 'Visitante';
        userAvatarElement.textContent = 'V';
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
    const logoutButton = document.getElementById('logout-button');
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user_name');
            localStorage.removeItem('user_id');
            // Redirecionar para a tela de login (ajuste o caminho se necessário)
            window.location.href = '../skeleton/index.html';
        });
    }

    // 4. Lógica da Barra de Pesquisa
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');

    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            // Mantém o GÊNERO ATIVO, mas filtra pela query
            loadBooks(query, GENERO_ATIVO_ID);
            // Garante que o catálogo esteja visível
            activateSection('catalogo-section');
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchButton.click();
            }
        });
    }

    // 5. Lógica do Filtro de Empréstimos (ATUALIZADA)
    const applyFilterButton = document.getElementById('apply-loan-filter');
    const filterStartDate = document.getElementById('filter-start-date');
    const filterEndDate = document.getElementById('filter-end-date');
    const filterStatus = document.getElementById('filter-leitor-status'); // NOVO ELEMENTO!

    if (applyFilterButton) {
        applyFilterButton.addEventListener('click', () => {
            const filters = {
                startDate: filterStartDate.value,
                endDate: filterEndDate.value,
                status: filterStatus.value
            };

            // Carrega do cache e aplica os filtros
            loadActiveLoans(filters);
        });
    }

    // 6. CARREGAR GÊNEROS E CATÁLOGO INICIAL (Inicia a aplicação)
    loadGenres();
    // Inicia a aplicação na seção de Catálogo
    activateSection('catalogo-section');
});