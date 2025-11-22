// -------------------------------
// CONFIGURAÇÃO DA API
// -------------------------------
// 🚨 VERIFIQUE SE ESTA URL ESTÁ CORRETA 🚨
const API_URL = "http://127.0.0.1:8000"; 


// ----------------------------------------------------------------
// FUNÇÕES DE EXIBIÇÃO DE CONTEÚDO E BUSCA
// ----------------------------------------------------------------

/**
 * Busca o nome de um autor através da rota /autores/{autorId}.
 * @param {number} autorId - O ID do autor a ser buscado.
 * @returns {Promise<string>} O nome do autor ou uma mensagem de erro.
 */
async function fetchAuthorDetails(autorId) {
    const token = localStorage.getItem('token');
    
    if (!token) {
        console.error("Token de autenticação ausente.");
        return 'Autor Desconhecido';
    }
    
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
            console.warn(`Autor ID ${autorId} não encontrado (Status: ${response.status})`);
            return 'Autor Não Listado';
        }

        const data = await response.json();
        
        // A API retorna um array porque sua rota tem response_model=list[AutorResponseSchema].
        const autorObj = data[0]; 
        
        if (autorObj && autorObj.nome) {
            // Concatena nome e sobrenome
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
 * Cria o elemento HTML (card) para um único livro.
 * @param {Object} livro - Objeto do livro retornado pela API /livros.
 * @param {string} nomeAutor - Nome completo do autor (obtido de fetchAuthorDetails).
 * @returns {HTMLElement} O elemento <div> do card do livro.
 */
function createBookCard(livro, nomeAutor) {
    const card = document.createElement('div');
    card.className = 'livro-card';
    card.setAttribute('data-livro-id', livro.livro_id);

    const titulo = livro.titulo;
    const ano = livro.ano_publicacao; 
    const autor = nomeAutor; 

    card.innerHTML = `
        <div class="capa-placeholder"></div>
        <div class="card-info">
            <h3 class="card-titulo">${titulo}</h3>
            <p class="card-detalhe">${ano} | ${autor}</p>
        </div>
        <button class="btn-detalhes" title="Solicitar empréstimo">
            <i class="fas fa-book-open"></i>
        </button>
    `;

    // Adiciona o evento de clique para a solicitação de empréstimo (futuro)
    card.querySelector('.btn-detalhes').addEventListener('click', () => {
        // Lógica para solicitar empréstimo
        alert(`Solicitação de empréstimo para: ${titulo} (ID: ${livro.livro_id})`);
    });

    return card;
}


/**
 * Função principal para buscar e exibir os livros no catálogo.
 * @param {string} searchQuery - Termo de busca (título/autor).
 * @param {string} genre - Gênero para filtro.
 */
async function loadBooks(searchQuery = '', genre = '') {
    const grid = document.querySelector('.livro-grid');
    if (!grid) return; 
    
    grid.innerHTML = '<div class="loading-message" style="text-align:center; color:#D4AF37;">Carregando grimórios...</div>';

    // 1. Constrói a URL para a rota /livros (pode incluir parâmetros de busca e gênero)
    let url = `${API_URL}/livros?`;
    if (searchQuery) {
        url += `search=${encodeURIComponent(searchQuery)}&`;
    }
    // 🚨 USO DO FILTRO DE GÊNERO NA URL
    if (genre) {
        // O backend espera um parâmetro como "genero" ou "genre"
        url += `genero=${encodeURIComponent(genre)}&`; 
    }
    
    const token = localStorage.getItem('token'); 

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        const livros = await response.json();
        grid.innerHTML = ''; 

        if (!response.ok) {
            grid.innerHTML = `<div class="error-message" style="color:#9E2A2B;">Erro ao carregar catálogo: ${livros.detail || 'Falha na API'}</div>`;
            return;
        }

        if (livros.length === 0) {
            grid.innerHTML = '<div class="empty-message" style="color:#F3F3F3;">Nenhum livro encontrado.</div>';
            return;
        }

        // 2. Mapear e esperar todas as chamadas de autor
        const renderPromises = livros.map(async livro => {
            const nomeAutor = await fetchAuthorDetails(livro.autor_id);
            const card = createBookCard(livro, nomeAutor); 
            return card;
        });

        const cards = await Promise.all(renderPromises);
        cards.forEach(card => grid.appendChild(card));

    } catch (error) {
        console.error('Erro de conexão ao buscar livros/autores:', error);
        grid.innerHTML = '<div class="error-message" style="color:#9E2A2B;">Falha de conexão com a API.</div>';
    }
}


/**
 * Busca a lista de gêneros da API (/generos) e preenche a barra lateral de filtros.
 */
async function loadGenres() {
    const list = document.querySelector('.genre-list');
    if (!list) return;

    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch(`${API_URL}/generos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const generos = await response.json();
        
        list.innerHTML = ''; // Limpa a lista estática
        
        // 1. Adiciona a opção "Todos" e define o primeiro como ativo
        list.innerHTML += `<li><a href="#" data-genre="" class="active">Todos os Livros</a></li>`;

        generos.forEach(genero => {
            const li = document.createElement('li');
            // O backend deve retornar 'nome' e 'genero_id'
            li.innerHTML = `<a href="#" data-genre="${genero.nome}">${genero.nome}</a>`;
            list.appendChild(li);
        });

        // 2. Adiciona o Event Listener para filtrar ao clicar
        list.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const selectedGenre = e.target.getAttribute('data-genre');
                
                // Gerencia a classe 'active' visualmente
                list.querySelectorAll('a').forEach(a => a.classList.remove('active'));
                e.target.classList.add('active');

                // Chama loadBooks com o filtro de gênero
                loadBooks('', selectedGenre); 
            });
        });

    } catch (error) {
        console.error('Erro ao carregar gêneros:', error);
        list.innerHTML = `<li><a href="#" style="color:#9E2A2B;">Erro ao carregar gêneros.</a></li>`;
    }
}


// ----------------------------------------------------------------
// LÓGICA DE INICIALIZAÇÃO DA PÁGINA (DOMContentLoaded)
// ----------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // 1. CARREGAR NOME DO USUÁRIO E INICIAL
    const userName = localStorage.getItem('user_name'); 
    const userNameElement = document.getElementById('user-name');
    const userAvatarElement = document.getElementById('user-avatar-initial');

    if (userName && userNameElement && userAvatarElement) {
        userNameElement.textContent = userName;
        userAvatarElement.textContent = userName.charAt(0).toUpperCase();
    } 

    // 2. FUNÇÕES EXISTENTES DE INTERATIVIDADE (Toggle)
    const menuToggle = document.querySelector('.menu-toggle');
    const sidebar = document.querySelector('.sidebar');
    const mainLayout = document.querySelector('.main-layout');

    if (menuToggle && sidebar && mainLayout) {
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            mainLayout.classList.toggle('sidebar-hidden');
        });
    }

    // 3. CARREGAR GÊNEROS E CATÁLOGO DE LIVROS
    loadGenres(); 
    loadBooks(); 
    
    // 4. Lógica da Barra de Pesquisa
    const searchInput = document.querySelector('.search-bar input[type="text"]');
    const searchButton = document.querySelector('.search-bar button');

    if (searchButton && searchInput) {
        searchButton.addEventListener('click', () => {
            const query = searchInput.value.trim();
            // Ao buscar, limpa o filtro de gênero (ou mantém o ativo, dependendo da lógica)
            loadBooks(query); 
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                searchButton.click();
            }
        });
    }
    

    // 5. Função para simular o filtro de empréstimos (Mantida)
    const btnFiltro = document.querySelector('.btn-filtro');
    const dataInicio = document.getElementById('data-inicio');
    const dataFim = document.getElementById('data-fim');

    if (btnFiltro) {
        btnFiltro.addEventListener('click', () => {
            console.log('Filtro aplicado!');
            console.log('Início:', dataInicio.value);
            console.log('Fim:', dataFim.value);
            // Lógica AJAX para recarregar a tabela de empréstimos virá aqui
        });
    }
});