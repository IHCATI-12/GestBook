// dashboard_leitor.js

// -------------------------------
// CONFIGURAÇÃO DA API E ESTADO GLOBAL
// -------------------------------
const API_URL = "http://127.0.0.1:8000";
let GENERO_ATIVO_ID = ""; // Armazena o ID do gênero atualmente selecionado
let LEITOR_ID = null; // ID do leitor logado, necessário para carregar empréstimos


// ----------------------------------------------------------------
// FUNÇÕES DE EXIBIÇÃO DE CONTEÚDO E BUSCA
// ----------------------------------------------------------------

/**
 * Busca o nome de um autor.
 * @param {number} autorId - ID do autor.
 * @returns {Promise<string>} Nome completo do autor ou uma string de erro.
 */
async function fetchAuthorDetails(autorId) {
    const token = localStorage.getItem('token');
    if (!token) return 'Autor Desconhecido';

    const url = `${API_URL}/autores/${autorId}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            return 'Autor Não Listado';
        }

        const data = await response.json();
        const autorObj = Array.isArray(data) ? data[0] : data;

        if (autorObj && autorObj.nome) {
            const nomeCompleto = `${autorObj.nome} ${autorObj.sobrenome || ''}`.trim();
            return nomeCompleto || 'Autor (Nome Ausente)';
        }
        return 'Autor (Nome Ausente)';

    } catch (error) {
        console.error("Falha de conexão ao buscar autor:", error);
        return 'Erro de Conexão';
    }
}

/**
 * Função principal para buscar e exibir os livros no catálogo.
 * @param {string} searchQuery - Termo de busca.
 * @param {string} generoId - ID do gênero para filtro.
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
 * @param {HTMLElement} gridElement - O elemento DOM onde os cards serão adicionados.
 * @param {Array<Object>} livros - Array de objetos de livro.
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
 * Carrega e exibe os empréstimos ativos do leitor.
 * @param {string} startDate - Data de início do filtro (opcional).
 * @param {string} endDate - Data de fim do filtro (opcional).
 */
async function loadActiveLoans(startDate = '', endDate = '') {
    const loansList = document.getElementById('loans-list');
    if (!loansList) return;

    loansList.innerHTML = '<p class="loading-message">Carregando empréstimos...</p>';

    if (!LEITOR_ID) {
        loansList.innerHTML = '<p class="error-message">Erro: ID do Leitor não encontrado. Por favor, faça login novamente.</p>';
        return;
    }

    let url = `${API_URL}/emprestimos/?leitor_id=${LEITOR_ID}`;
    const token = localStorage.getItem('token');

    if (startDate) {
        url += `&data_inicio=${startDate}`;
    }
    if (endDate) {
        url += `&data_fim=${endDate}`;
    }

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        const emprestimos = await response.json();
        loansList.innerHTML = '';

        if (!response.ok) {
            loansList.innerHTML = `<p class="error-message">Erro ao carregar empréstimos: ${emprestimos.detail || 'Falha na API'}</p>`;
            return;
        }

        if (emprestimos.length === 0) {
            loansList.innerHTML = '<p class="empty-message">Nenhum empréstimo ativo encontrado.</p>';
            return;
        }

        emprestimos.forEach(emprestimo => {
            const card = document.createElement('div');
            card.classList.add('loan-card');

            // --- Lógica de Atraso ---
            const dataDevolucao = new Date(emprestimo.data_devolucao_prevista);
            const hoje = new Date();
            hoje.setHours(0,0,0,0);
            dataDevolucao.setHours(0,0,0,0);

            const isOverdue = dataDevolucao < hoje;
            const dueDateClass = isOverdue ? 'overdue' : '';

            // Dados simulados do livro, se o endpoint de empréstimo não os fornecer
            const livroTitulo = emprestimo.livro_titulo || 'Título Desconhecido';
            const autorNome = emprestimo.autor_nome || 'Autor Desconhecido';
            const dataEmprestimo = new Date(emprestimo.data_emprestimo).toLocaleDateString('pt-BR');
            const dataPrevista = new Date(emprestimo.data_devolucao_prevista).toLocaleDateString('pt-BR');


            card.innerHTML = `
                <h3>${livroTitulo}</h3>
                <p><strong>Autor:</strong> ${autorNome}</p>
                <p><strong>Emprestado em:</strong> ${dataEmprestimo}</p>
                <p><strong>Previsão de Devolução:</strong> <span class="due-date ${dueDateClass}">${dataPrevista}</span></p>
                ${isOverdue ? '<p class="overdue-message" style="color: var(--error-red); font-weight: 600;">⚠️ Atrasado!</p>' : ''}
            `;
            loansList.appendChild(card);
        });

    } catch (error) {
        console.error('Erro de conexão ao buscar empréstimos:', error);
        loansList.innerHTML = '<p class="error-message">Falha de conexão com a API.</p>';
    }
}

// ----------------------------------------------------------------
// FUNÇÕES DE GÊNEROS DINÂMICOS
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
// LÓGICA DE INTERAÇÃO DA UI (ATIVAÇÃO DE SEÇÕES, ETC.)
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
        loadActiveLoans();
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

    // 5. Lógica do Filtro de Empréstimos
    const applyFilterButton = document.getElementById('apply-loan-filter');
    const filterStartDate = document.getElementById('filter-start-date');
    const filterEndDate = document.getElementById('filter-end-date');

    if (applyFilterButton) {
        applyFilterButton.addEventListener('click', () => {
            const start = filterStartDate.value;
            const end = filterEndDate.value;
            if (start || end) {
                loadActiveLoans(start, end);
            } else {
                 // Recarrega todos se os campos estiverem vazios
                loadActiveLoans(); 
            }
        });
    }

    // 6. CARREGAR GÊNEROS E CATÁLOGO INICIAL (Inicia a aplicação)
    loadGenres(); 
    // Inicia a aplicação na seção de Catálogo
    activateSection('catalogo-section'); 
});