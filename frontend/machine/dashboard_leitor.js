// ====================================================================
// ⚙️ CONFIGURAÇÃO DA API E ESTADO GLOBAL
// Variáveis globais para armazenar configurações e estado da aplicação.
// ====================================================================

/**
 * URL base da API (Root URL).
 */
const API_URL = "http://127.0.0.1:8000";

/**
 * Armazena o ID do gênero atualmente selecionado para filtrar o catálogo de livros.
 * Inicialmente vazio para carregar todos os livros.
 */
let GENERO_ATIVO_ID = "";

/**
 * ID do leitor logado, obtido do LocalStorage na inicialização.
 * Essencial para carregar empréstimos específicos do usuário.
 */
let LEITOR_ID = null;

/**
 * Cache local dos empréstimos do leitor, carregado da API uma única vez
 * para permitir filtros locais rápidos (data e status) sem requisições repetidas.
 */
let leitorLoansCache = [];

// ====================================================================
// 🔎 FUNÇÕES DE FILTRO DE EMPRÉSTIMOS
// Lógica para filtrar a lista de empréstimos do leitor no lado do cliente.
// ====================================================================

/**
 * Aplica filtros locais (Status e Data) à lista de empréstimos em cache.
 * A filtragem é feita a partir dos dados já carregados para o leitor.
 *
 * @param {Array<Object>} loans - Lista completa de empréstimos do leitor.
 * @param {Object} filters - Objeto contendo { startDate, endDate, status }.
 * @returns {Array<Object>} Lista de empréstimos filtrada.
 */
function applyLeitorLoanFilters(loans, filters) {
    let filtered = loans;

    // Converte e normaliza as datas de filtro
    const startDate = filters.startDate ? new Date(filters.startDate) : null;
    const endDate = filters.endDate ? new Date(filters.endDate) : null;

    // Ajusta a hora para cobrir o dia inteiro para os filtros de data
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(23, 59, 59, 999);

    const statusFiltro = filters.status;

    // 1. Filtro por Data
    if (startDate || endDate) {
        filtered = filtered.filter(loan => {
            const loanDate = new Date(loan.data_emprestimo);
            loanDate.setHours(0, 0, 0, 0); // Normaliza a data do empréstimo para comparação

            const matchesStart = startDate ? loanDate >= startDate : true;
            const matchesEnd = endDate ? loanDate <= endDate : true;

            return matchesStart && matchesEnd;
        });
    }

    // 2. Filtro por Status
    if (statusFiltro && statusFiltro !== "") {
        filtered = filtered.filter(loan => {
            // is_atrasado vem diretamente da API, indicando se a data de devolução prevista expirou.
            const isOverdue = loan.is_atrasado;
            const apiStatus = (loan.status_emprestimo || '').toLowerCase();
            const isEmprestado = apiStatus === 'emprestado';
            const isDevolvido = apiStatus === 'devolvido';

            if (statusFiltro === "Atrasado") {
                // Empréstimo está ativo E está atrasado
                return isOverdue;
            } else if (statusFiltro === "Devolvido") {
                return isDevolvido;
            } else if (statusFiltro === "Emprestado") {
                // Emprestado (Ativos e Em Dia) = Emprestado E não Atrasado
                return isEmprestado && !isOverdue;
            }
            // Se "Todos os Status" ou status desconhecido, retorna verdadeiro
            return true;
        });
    }

    return filtered;
}

// ====================================================================
// 🔄 FUNÇÕES DE BUSCA DE DETALHES (LIVRO E AUTOR)
// Requisições para enriquecer os dados dos empréstimos (título, autor).
// ====================================================================


/**
 * Busca o nome completo de um autor pelo ID na API.
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

        const data = await response.json();
        // A API pode retornar um único objeto ou um array. Pega o primeiro ou o objeto.
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
 * Busca os detalhes de um livro (título, ID do autor E IDs de Gênero) pelo ID.
 * É usada para popular detalhes em Empréstimos e Gêneros.
 * @param {number} livroId - ID do livro.
 * @returns {Promise<Object>} Um objeto contendo { titulo, autor_id, lista_generos_ids } ou um objeto de erro.
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
            // **CORREÇÃO CRUCIAL:** Se o campo lista_generos_ids não vier na rota /livros/{id},
            // mas vier na rota /livros? (lista), precisamos garantir que estamos tratando o array vazio.
            return {
                titulo: livro.titulo,
                autor_id: livro.autor_id,
                // Assumimos que, se a API de lista não retorna, a API de detalhes também não retornará.
                // Usaremos um array vazio para evitar erros.
                lista_generos_ids: livro.lista_generos_ids || [] 
            };
        }
        return { titulo: `Livro ID ${livroId} (Título Ausente)`, autor_id: null, lista_generos_ids: [] };

    } catch (error) {
        console.error(`Falha de conexão ao buscar livro ${livroId}:`, error);
        return { titulo: `Livro ID ${livroId} (Erro de Conexão)`, autor_id: null, lista_generos_ids: [] };
    }
}

// ====================================================================
// 📚 FUNÇÕES DE EXIBIÇÃO DE CONTEÚDO E BUSCA (Catálogo e Empréstimos)
// Lógica para carregar e renderizar os dados nas seções da dashboard.
// ====================================================================

/**
 * Alias de compatibilidade. Mantido para a função `loadBooks`
 * que usa este nome para buscar o nome do autor.
 */
async function fetchAuthorDetails(autorId) {
    // Reutiliza a função principal
    const nomeCompleto = await fetchAuthorName(autorId);
    return nomeCompleto;
}


/**
 * Busca e exibe os livros no catálogo, aplicando filtros de busca e gênero.
 * @param {string} [searchQuery=''] - Termo de busca para o título/ISBN.
 * @param {string} [generoId=GENERO_ATIVO_ID] - ID do gênero para filtro.
 */
async function loadBooks(searchQuery = '', generoId = GENERO_ATIVO_ID) {
    const bookGrid = document.getElementById('book-grid');
    if (!bookGrid) return;

    bookGrid.innerHTML = '<p class="loading-message">Carregando livros...</p>';

    // Constrói a URL da API com base nos filtros
    let url = `${API_URL}/livros?`;
    const token = localStorage.getItem('token');

    if (generoId) {
        url += `genero=${encodeURIComponent(generoId)}&`;
    }
    if (searchQuery) {
        url += `search=${encodeURIComponent(searchQuery)}&`;
    }
    // Remove o '&' final se houver
    url = url.slice(-1) === '&' ? url.slice(0, -1) : url;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        const livros = await response.json();
        bookGrid.innerHTML = ''; // Limpa a mensagem de carregamento

        if (!response.ok) {
            bookGrid.innerHTML = `<p class="error-message">Erro ao carregar catálogo: ${livros.detail || 'Falha na API'}</p>`;
            return;
        }

        if (livros.length === 0) {
            bookGrid.innerHTML = '<p class="empty-message">Nenhum livro encontrado no catálogo.</p>';
            return;
        }

        // Renderiza a lista de livros após obter os detalhes de seus autores
        await renderBooksInCards(bookGrid, livros);

    } catch (error) {
        console.error('Erro de conexão ao buscar livros/autores:', error);
        bookGrid.innerHTML = '<p class="error-message">Falha de conexão com a API.</p>';
    }
}

/**
 * Renderiza os livros como cards no grid. (BUSCA DE GÊNERO CORRIGIDA)
 * @param {HTMLElement} gridElement - O elemento HTML onde os cards serão inseridos.
 * @param {Array<Object>} livros - Lista de objetos de livros.
 */
async function renderBooksInCards(gridElement, livros) {
    const renderPromises = livros.map(async livro => {
        // 1. Busca o nome do Autor
        const nomeAutor = await fetchAuthorDetails(livro.autor_id);

        // 2. Busca o nome do Gênero
        let generoNome = 'Gênero Desconhecido';
        
        // **CORREÇÃO:** Tentamos acessar o campo lista_generos_ids no objeto 'livro'
        // Se a API não estiver retornando este campo, a lógica abaixo falhará.
        // Se estiver retornando, a lógica continuará.
        const listaGeneros = livro.lista_generos_ids; 

        if (listaGeneros && listaGeneros.length > 0) {
            const generoId = listaGeneros[0];
            
            // Chamada à função fetchGenreName para obter o nome
            const nomeEncontrado = await fetchGenreName(generoId); 
            
            if (nomeEncontrado && nomeEncontrado !== 'Gênero Não Encontrado' && nomeEncontrado !== 'Erro de Conexão (Gênero)') {
                generoNome = nomeEncontrado;
            }
        }
        
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
 * Carrega todos os empréstimos do leitor (se o cache estiver vazio) e aplica filtros.
 * Se o cache estiver preenchido, apenas aplica os filtros localmente.
 * @param {Object} [filters={}] - Objeto contendo { startDate, endDate, status }.
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

    // Se o cache estiver vazio, recarrega TUDO da API para garantir dados atualizados
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

    // Aplica filtros ao cache e renderiza o resultado
    const filteredLoans = applyLeitorLoanFilters(leitorLoansCache, filters);

    // Renderiza a lista de empréstimos filtrada
    await renderLeitorLoans(filteredLoans, loansList);
}

/**
 * Renderiza os empréstimos do leitor (filtrados ou completos) na tela.
 * Envolve buscar detalhes do livro e autor para cada empréstimo.
 * @param {Array<Object>} emprestimos - Lista de empréstimos a serem exibidos.
 * @param {HTMLElement} loansList - O elemento HTML onde os cards serão inseridos.
 */
async function renderLeitorLoans(emprestimos, loansList) {
    loansList.innerHTML = ''; // Limpa a lista antes de renderizar

    if (emprestimos.length === 0) {
        loansList.innerHTML = '<p class="empty-message">Nenhum empréstimo que corresponda aos filtros.</p>';
        return;
    }

    // Processa os empréstimos em paralelo
    const renderPromises = emprestimos.map(async emprestimo => {
        // 1. Buscar detalhes do Livro (Título e autor_id)
        const bookDetails = await fetchBookDetails(emprestimo.livro_id);
        const livroTitulo = bookDetails.titulo;

        // 2. Buscar Nome do Autor
        let autorNome = 'Autor Desconhecido';
        if (bookDetails.autor_id) {
            autorNome = await fetchAuthorName(bookDetails.autor_id);
        }

        // Formatação das datas para exibição
        const dataEmprestimo = new Date(emprestimo.data_emprestimo).toLocaleDateString('pt-BR');
        // Usa a data de devolução real se devolvido, ou a prevista se ainda emprestado
        const dataDevolucaoRef = emprestimo.data_devolucao_real || emprestimo.data_devolucao_prevista;
        const dataDisplay = new Date(dataDevolucaoRef).toLocaleDateString('pt-BR');

        // --- Lógica de Status (Definição de texto e classes CSS) ---
        const apiStatus = (emprestimo.status_emprestimo || '').toLowerCase();
        // O status de atraso é recebido pronto da API
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
            if (isOverdue) {
                // Emprestado e Atrasado
                dueDateClass = 'overdue';
                statusText = '<p class="overdue-message" style="color: var(--error-red); font-weight: 600;">⚠️ ATRASADO!</p>';
            } else {
                // Emprestado e Em Dia
                dueDateClass = 'in-time';
                statusText = '<p style="color: var(--success-green); font-weight: 600;">✅ EM DIA</p>';
            }
        }

        // Cria e insere o card de empréstimo
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

    // Aguarda a conclusão de todas as Promises de renderização
    await Promise.all(renderPromises);
}

// ====================================================================
// 🏷️ FUNÇÕES DE GÊNEROS DINÂMICOS
// Lógica para carregar e gerenciar os filtros de gênero na sidebar.
// ====================================================================

/**
 * Cria um link para filtrar por gênero e anexa o evento de clique.
 * @param {string} nome - Nome do gênero a ser exibido.
 * @param {string} id - ID do gênero (ou string vazia para 'Todos os Livros').
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
        GENERO_ATIVO_ID = selectedGenreId; // Atualiza o estado global

        // Remove a classe 'active' de todos os links e adiciona ao link clicado
        listElement.querySelectorAll('a').forEach(link => link.classList.remove('active'));
        a.classList.add('active');

        // Recarrega o catálogo com o novo filtro de gênero
        loadBooks('', selectedGenreId);
        // Garante que a seção do catálogo esteja visível
        activateSection('catalogo-section');
    });

    li.appendChild(a);
    return li;
}

/**
 * Carrega a lista de gêneros da API e os exibe na sidebar como links de filtro.
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

        list.innerHTML = ''; // Limpa a lista existente

        // Adiciona a opção padrão "Todos os Livros"
        const linkTodos = createGenreFilterLink('Todos os Livros', '', list);
        list.appendChild(linkTodos);

        // Adiciona os gêneros retornados pela API
        generos.forEach(genero => {
            const link = createGenreFilterLink(genero.nome, genero.genero_id, list);
            list.appendChild(link);
        });

        // Configura o filtro "Todos os Livros" como ativo por padrão e carrega o catálogo inicial
        const todosLink = list.querySelector('a[data-genre-id=""]');
        if (todosLink) {
            todosLink.classList.add('active');
            GENERO_ATIVO_ID = ""; // Limpa o ID ativo
            loadBooks('', ""); // Carrega todos os livros
        }

    } catch (error) {
        console.error('Erro ao carregar gêneros:', error);
        list.innerHTML = `<li><a href="#" style="color:var(--error-red);">Erro ao carregar gêneros.</a></li>`;
    }
}

// ====================================================================
// 🖱️ LÓGICA DE INTERAÇÃO DA UI
// Funções para gerenciar a interface, navegação e eventos de clique.
// ====================================================================

/**
 * Ativa uma seção de conteúdo específica e desativa as outras na dashboard.
 * Também atualiza a barra lateral (sidebar) e carrega dados se necessário.
 * @param {string} sectionId - O ID da seção a ser ativada (ex: 'catalogo-section').
 */
function activateSection(sectionId) {
    // 1. Gerenciamento de Seções de Conteúdo
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');

    // 2. Gerenciamento de Links da Sidebar
    document.querySelectorAll('.main-menu .menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
        }
    });

    // 3. Carregamento de Dados Específicos (apenas para a seção de Empréstimos)
    if (sectionId === 'emprestimos-section' && LEITOR_ID) {
        // Limpa o cache para forçar a busca na API em caso de reentrada na seção
        leitorLoansCache = [];
        // Chama com o filtro padrão (Emprestado, ou seja, ativos e em dia ou atrasados)
        loadActiveLoans({ status: 'Emprestado' });
    }
}

// ====================================================================
// 🚀 LÓGICA DE INICIALIZAÇÃO DA PÁGINA (DOMContentLoaded)
// O código principal que configura a dashboard quando a página é carregada.
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. CARREGAR DADOS DO USUÁRIO E ID
    const userName = localStorage.getItem('user_name');
    const userIdString = localStorage.getItem('user_id');
    const userNameElement = document.getElementById('user-name');
    const userAvatarElement = document.getElementById('user-avatar-initial');

    // Tenta converter o ID do leitor para número inteiro
    if (userIdString) {
        LEITOR_ID = parseInt(userIdString);
    }

    // Exibe o nome e a inicial do usuário logado
    if (userName && userNameElement && userAvatarElement) {
        userNameElement.textContent = userName;
        userAvatarElement.textContent = userName.charAt(0).toUpperCase();
    } else {
        userNameElement.textContent = 'Visitante';
        userAvatarElement.textContent = 'V';
    }

    // 2. CONFIGURAR NAVEGAÇÃO DA SIDEBAR (Eventos de clique para trocar de seção)
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
            // Remove as credenciais e dados do usuário do LocalStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user_name');
            localStorage.removeItem('user_id');
            // Redireciona para a tela de login
            window.location.href = '../skeleton/index.html';
        });
    }

    // 4. Lógica da Barra de Pesquisa (Catálogo)
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');

    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            // Carrega livros com a query, mantendo o filtro de gênero ativo
            loadBooks(query, GENERO_ATIVO_ID);
            // Garante que o catálogo esteja visível
            activateSection('catalogo-section');
        });

        // Permite buscar ao pressionar Enter no campo de busca
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchButton.click();
            }
        });
    }

    // 5. Lógica do Filtro de Empréstimos (Aplicação dos filtros)
    const applyFilterButton = document.getElementById('apply-loan-filter');
    const filterStartDate = document.getElementById('filter-start-date');
    const filterEndDate = document.getElementById('filter-end-date');
    const filterStatus = document.getElementById('filter-leitor-status');

    if (applyFilterButton) {
        applyFilterButton.addEventListener('click', () => {
            // Reúne os valores dos campos de filtro
            const filters = {
                startDate: filterStartDate.value,
                endDate: filterEndDate.value,
                status: filterStatus.value
            };

            // Recarrega do cache e aplica os filtros
            loadActiveLoans(filters);
        });
    }

    // 6. CARREGAR GÊNEROS E CATÁLOGO INICIAL (Inicia a aplicação)
    loadGenres();
    // Ativa a seção de Catálogo como a tela inicial
    activateSection('catalogo-section');
});