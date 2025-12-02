// ====================================================================
// 📅 FUNÇÕES DE CÁLCULO DE DATA (DEVE VIR PRIMEIRO)
// ====================================================================

/**
 * Função utilitária para calcular a data de amanhã no formato YYYY-MM-DD (ISO 8601 simplificado).
 * @returns {string} A data de amanhã (ex: "2024-01-01").
 */
function getTomorrowDate() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    // Usa toISOString() e pega apenas a parte da data
    return tomorrow.toISOString().split('T')[0];
}

// ====================================================================
// ⚙️ CONFIGURAÇÃO DA API E ESTADO GLOBAL
// ====================================================================
const API_URL = "http://127.0.0.1:8000";

/**
 * ID do bibliotecário logado. Preenchido na inicialização.
 */
let BIBLIOTECARIO_ID = null;

/**
 * Data de hoje no formato YYYY-MM-DD.
 */
const TODAY = new Date().toISOString().split('T')[0];

/**
 * Data de amanhã, calculada via getTomorrowDate().
 */
const TOMORROW = getTomorrowDate();

/**
 * Cache para armazenar os empréstimos ativos (ou todos) e aplicar filtros locais rápidos.
 * Contém a propriedade `__url` para rastrear o endpoint de onde veio.
 */
let activeLoansCache = [];

// ====================================================================
// 🛠️ FUNÇÕES UTILITÁRIAS (Mensagens, Confirmação e Validação)
// ====================================================================

/**
 * Exibe uma mensagem de feedback (sucesso ou erro) em um container específico,
 * inserindo-a no topo e removendo-a após 5 segundos.
 *
 * @param {string} containerId - O ID do container pai ou um fallback (ex: 'loan-create-form-container').
 * @param {string} message - O texto da mensagem (pode conter HTML).
 * @param {boolean} isError - Se a mensagem é de erro (true) ou sucesso (false).
 */
function showMessage(containerId, message, isError = false) {
    const container = document.getElementById(containerId);
    // Tenta usar o ID fornecido ou usa um container padrão
    const targetContainer = container || document.getElementById('loan-create-form-container');
    if (!targetContainer) return;

    // Remove quaisquer mensagens anteriores
    targetContainer.querySelectorAll('.error-message, .success-message').forEach(el => el.remove());

    const messageElement = document.createElement('p');
    const messageClass = isError ? 'error-message' : 'success-message';
    messageElement.className = messageClass;
    messageElement.innerHTML = message;

    // Insere no início do container
    targetContainer.insertBefore(messageElement, targetContainer.firstChild);

    // Oculta após 5 segundos
    setTimeout(() => {
        messageElement.remove();
    }, 5000);
}

/**
 * Tenta extrair e simplificar a mensagem de erro detalhada de uma resposta da API (FastAPI/Pydantic).
 * Inclui tratamento específico para erros de data de devolução e data de nascimento.
 *
 * @param {Object} result - O objeto JSON retornado pela API.
 * @returns {string} - A mensagem de erro formatada e simplificada.
 */
function extractApiErrorMessage(result) {
    if (result && result.detail) {
        if (Array.isArray(result.detail) && result.detail.length > 0) {

            // 1. Tratamento específico para erro de regra de negócio da data de devolução
            const dataError = result.detail.find(err =>
                err.msg && err.msg.includes('A data de devolução prevista deve ser posterior')
            );

            if (dataError) {
                 return `❌ **Data Inválida**: A devolução deve ser agendada a partir de ${TOMORROW} (dia de amanhã).`;
            }

            // 2. Tratamento para erro de data de nascimento (simplifica a mensagem)
            const dateError = result.detail.find(err => err.loc && err.loc.includes('data_nascimento'));

            if (dateError) {
                const simplifiedMsg = dateError.msg
                    .replace(/Value error, /g, '')
                    .replace(/\(\d{4}-\d{2}-\d{2}\)\./g, '.'); // Remove datas específicas
                return `**Data Nascimento**: ${simplifiedMsg}`;
            }

            // 3. Tratamento genérico para outros erros de validação
            let errorMessages = result.detail.map(err => {
                // Junta os campos da localização (ex: body.campo_x -> campo_x)
                const loc = err.loc ? err.loc.slice(1).join('.') : 'API';
                const msg = err.msg.length > 50 ? err.msg.substring(0, 50) + '...' : err.msg;
                return `**${loc}**: ${msg}`;
            }).join('; ');
            return `Erros de Validação: ${errorMessages}`;
        }
        // Se 'detail' for uma string simples
        return result.detail.toString();
    }
    return 'Erro desconhecido. Verifique o console para mais detalhes.';
}


/**
 * Cria uma caixa de diálogo de confirmação modal personalizada,
 * substituindo o `window.confirm()` nativo.
 *
 * @param {string} title - Título da caixa de diálogo.
 * @param {string} message - Mensagem principal da confirmação.
 * @param {string} [confirmText='Confirmar'] - Texto do botão de confirmação.
 * @returns {Promise<boolean>} Promessa que resolve para `true` se confirmado, `false` se cancelado.
 */
function customConfirm(title, message, confirmText = 'Confirmar') {
    return new Promise(resolve => {
        const modal = document.getElementById('custom-confirm-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalMessage = document.getElementById('modal-message');
        const btnConfirm = document.getElementById('btn-confirm');
        const btnCancel = document.getElementById('btn-cancel');

        // Preenche o modal
        modalTitle.textContent = title;
        modalMessage.textContent = message;
        btnConfirm.textContent = confirmText;

        // Limpa handlers anteriores para evitar duplicação
        btnConfirm.onclick = null;
        btnCancel.onclick = null;

        // Define a ação de confirmação
        btnConfirm.onclick = () => {
            modal.classList.remove('active');
            resolve(true);
        };

        // Define a ação de cancelamento
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
 * Também carrega dados necessários para a seção recém-ativada.
 *
 * @param {string} sectionId - O ID da seção a ser ativada (ex: 'dashboard-home').
 */
function activateSection(sectionId) {
    // 1. Gerenciamento de Seções de Conteúdo
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(sectionId).classList.add('active');

    // 2. Gerenciamento de Links da Sidebar e Título da Seção
    document.querySelectorAll('.main-menu .menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionId) {
            item.classList.add('active');
            // Atualiza o título da seção atual na UI
            const title = item.textContent.trim();
            document.getElementById('current-section-title').textContent = title;
        }
    });

    // 3. Carregamento de Dados Específicos para a Seção
    switch (sectionId) {
        case 'dashboard-home':
            loadSummaryData();
            break;
        case 'emprestimos-section':
            loadLoanCreationData(); // Carrega Leitores/Livros para criação/filtros
            activeLoansCache = []; // Força recarregar os empréstimos (sem filtro inicial)
            loadActiveLoansAdmin({});
            break;
        case 'gerenciar-livros-section':
            loadBookCreationData(); // Carrega Autores/Gêneros para o formulário
            loadBookDeleteOptions(); // Carrega a lista de livros para exclusão
            break;
        case 'gerenciar-autores-section':
            loadAuthorDeleteOptions(); // Carrega a lista de autores para exclusão
            break;
        case 'gerenciar-generos-section':
            loadGenreDeleteOptions(); // Carrega a lista de gêneros para exclusão
            break;
        case 'catalogo-section':
            loadBooks(document.getElementById('book-grid-admin')); // Carrega todos os livros no catálogo de consulta
            break;
    }
}

/**
 * Função auxiliar genérica para preencher um elemento `<select>` (dropdown) com dados da API.
 *
 * @param {string} url - URL do endpoint da API.
 * @param {string} selectId - ID do elemento `<select>`.
 * @param {string} keyId - Nome da chave que será usada como `value` da opção (ex: 'autor_id').
 * @param {string|function} keyName - Nome da chave ou função para obter o texto da opção (ex: 'nome' ou `(item) => item.nome + item.sobrenome`).
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

            // Mensagem de erro específica para o usuário (ex: se não houver leitores)
            if(select.id === 'loan-leitor-id' || select.id === 'filter-leitor-id'){
                showMessage(select.closest('.form-container') || document.body, `❌ Falha ao carregar Leitores: ${data.detail || 'Verifique o console.'}`, true);
            }
            return;
        }

        // Preenche o select com as opções
        data.forEach(item => {
            const option = document.createElement('option');
            option.value = item[keyId];
            option.textContent = typeof keyName === 'function' ? keyName(item) : item[keyName];
            select.appendChild(option);
        });

        if (data.length > 0) {
            // Garante que o texto padrão permaneça (ou mude se o select for requerido)
            select.querySelector('option[disabled][selected]').textContent = defaultText;
        } else {
             select.innerHTML = `<option value="" disabled selected>Nenhum dado encontrado.</option>`;
        }

    } catch (error) {
        console.error(`Falha ao carregar ${selectId}:`, error);
        select.innerHTML = `<option value="" disabled selected>Erro ao carregar dados.</option>`;
    }
}


// ====================================================================
// 🖋️ GERENCIAR AUTORES
// ====================================================================

// CREATE (Criação de Autor)
async function createAuthor(event) {
    event.preventDefault();

    // Captura os dados do formulário
    const nome = document.getElementById('author-nome').value;
    const sobrenome = document.getElementById('author-sobrenome').value;
    const data_nascimento = document.getElementById('author-data-nascimento').value;
    const nacionalidade = document.getElementById('author-nacionalidade').value;
    const form = document.getElementById('create-author-form');

    // Prepara o payload, usando null para campos opcionais vazios
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
            loadAuthorDeleteOptions(); // Atualiza a lista para exclusão
            loadBookCreationData(); // Atualiza a lista de autores no formulário de livro
        } else {
            const errorMsg = extractApiErrorMessage(result);
            showMessage(containerId, `❌ Falha ao cadastrar autor: ${errorMsg}`, true);
        }
    } catch (error) {
        showMessage(containerId, 'Erro de conexão com a API ao cadastrar autor.', true);
        console.error("Erro ao criar autor:", error);
    }
}

// DELETE (Carrega opções para exclusão)
async function loadAuthorDeleteOptions() {
    await fillSelect(
        `${API_URL}/autores`,
        'delete-author-id',
        'autor_id',
        (item) => `${item.nome} ${item.sobrenome || ''} (ID: ${item.autor_id})`,
        'Selecione o Autor a Excluir'
    );
}

// DELETE (Exclui Autor)
async function deleteAuthor(event) {
    event.preventDefault();
    const authorId = document.getElementById('delete-author-id').value;
    const token = localStorage.getItem('token');
    const url = `${API_URL}/autores/${authorId}`;
    const containerId = 'author-delete-form-container';

    // Confirmação antes de excluir
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
            loadAuthorDeleteOptions(); // Recarrega a lista
            loadBookCreationData(); // Recarrega a lista de autores no formulário de livro
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


// ====================================================================
// 📖 GERENCIAR LIVROS
// ====================================================================

// LOAD DATA (Carrega Autores e Gêneros para o formulário de criação de livro)
async function loadBookCreationData() {
    const token = localStorage.getItem('token');

    // 1. Carrega Autores (para o campo `book-autor-id`)
    await fillSelect(
        `${API_URL}/autores`,
        'book-autor-id',
        'autor_id',
        (item) => `${item.nome} ${item.sobrenome || ''}`,
        'Selecione um Autor'
    );

    // 2. Carrega Gêneros (para o campo `book-generos-ids`)
    await fillSelect(
        `${API_URL}/generos`,
        'book-generos-ids',
        'genero_id',
        'nome',
        'Carregando gêneros...'
    );
}

// CREATE (Criação de Livro)
async function createBook(event) {
    event.preventDefault();

    const form = document.getElementById('create-book-form');
    const generosSelect = document.getElementById('book-generos-ids');
    // Captura os IDs de todos os gêneros selecionados
    const selectedGenres = Array.from(generosSelect.selectedOptions).map(option => parseInt(option.value));

    // Prepara o payload
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
            loadBookDeleteOptions(); // Atualiza lista de exclusão
            loadLoanCreationData(); // Atualiza lista de livros no formulário de empréstimo
            loadBooks(document.getElementById('book-grid-admin')); // Atualiza catálogo
            loadSummaryData(); // Atualiza resumo de cópias
        } else {
            const errorMsg = extractApiErrorMessage(result);
            showMessage(containerId, `❌ Falha ao cadastrar livro: ${errorMsg}`, true);
        }
    } catch (error) {
        showMessage(containerId, 'Erro de conexão com a API ao cadastrar livro.', true);
        console.error("Erro ao criar livro:", error);
    }
}

// DELETE (Carrega opções para exclusão)
async function loadBookDeleteOptions() {
    await fillSelect(
        `${API_URL}/livros`,
        'delete-book-id',
        'livro_id',
        (item) => `${item.titulo} (ISBN: ${item.isbn})`,
        'Selecione o Livro a Excluir'
    );
}

// DELETE (Exclui Livro e Empréstimos associados)
async function deleteBook(event) {
    event.preventDefault();
    const bookId = document.getElementById('delete-book-id').value;
    const token = localStorage.getItem('token');
    // ATENÇÃO: Endpoint específico para exclusão em cascata condicional (se não houver empréstimos ativos)
    const url = `${API_URL}/livros/${bookId}/com-emprestimos`;
    const containerId = 'book-delete-form-container';

    // Confirmação de alto risco
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


// ====================================================================
// 🏷️ GERENCIAR GÊNEROS
// ====================================================================

// CREATE (Criação de Gênero)
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
            loadGenreDeleteOptions(); // Atualiza a lista para exclusão
            loadBookCreationData(); // Atualiza a lista de gêneros no formulário de livro
        } else {
            const errorMsg = extractApiErrorMessage(result);
            showMessage(containerId, `❌ Falha ao cadastrar gênero: ${errorMsg}`, true);
        }
    } catch (error) {
        showMessage(containerId, 'Erro de conexão com a API ao cadastrar gênero.', true);
        console.error("Erro ao criar gênero:", error);
    }
}

// DELETE (Carrega opções para exclusão)
async function loadGenreDeleteOptions() {
    await fillSelect(
        `${API_URL}/generos`,
        'delete-genre-id',
        'genero_id',
        'nome',
        'Selecione o Gênero a Excluir'
    );
}

// DELETE (Exclui Gênero)
async function deleteGenre(event) {
    event.preventDefault();
    const genreId = document.getElementById('delete-genre-id').value;
    const token = localStorage.getItem('token');
    const url = `${API_URL}/generos/${genreId}`;
    const containerId = 'genre-delete-form-container';

    // Confirmação antes de excluir
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
            loadGenreDeleteOptions(); // Recarrega a lista
            loadBookCreationData(); // Recarrega a lista de gêneros no formulário de livro
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


// ====================================================================
// 💳 GERENCIAR EMPRÉSTIMOS
// ====================================================================

// LOAD DATA (Carrega Leitores e Livros para criação e filtros)
async function loadLoanCreationData() {
    const token = localStorage.getItem('token');

    // 1. Carrega Leitores (para criação e filtro)
    await fillSelect(
        `${API_URL}/usuarios/leitores/`,
        'loan-leitor-id', // Select de Criação
        'usuario_id',
        (item) => `${item.nome || ''} ${item.sobrenome || ''}`.trim(),
        'Selecione um Leitor'
    );
    await fillSelect(
        `${API_URL}/usuarios/leitores/`,
        'filter-leitor-id', // Select de Filtro
        'usuario_id',
        (item) => `${item.nome || ''} ${item.sobrenome || ''}`.trim(),
        'Todos os Leitores'
    );

    // 2. Carrega Livros (apenas disponíveis, com estoque > 0)
    await fillSelect(
        `${API_URL}/livros/estoque/`,
        'loan-book-id',
        'livro_id',
        (item) => `${item.titulo} (Estoque: ${item.numero_copias || 1})`,
        'Selecione um Livro'
    );

    // 3. Define a data mínima para devolução (amanhã) no campo de data
    document.getElementById('loan-data-devolucao').setAttribute('min', TOMORROW);
}

// CREATE (Criação de Empréstimo)
async function createLoan(event) {
    event.preventDefault();

    if (!BIBLIOTECARIO_ID) {
        showMessage('loan-create-form-container', '❌ Erro: ID do Bibliotecário não encontrado. Faça login novamente.', true);
        return;
    }

    const form = document.getElementById('create-loan-form');
    // Prepara o payload, formatando a data para o padrão ISO com horário no fuso 0Z (UTC)
    const loanData = {
        livro_id: parseInt(document.getElementById('loan-book-id').value),
        leitor_id: parseInt(document.getElementById('loan-leitor-id').value),
        bibliotecario_id: BIBLIOTECARIO_ID,
        // Adiciona T00:00:00.000Z para garantir que o backend interprete corretamente a data
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

            // Recarrega dados afetados
            loadSummaryData();
            loadLoanCreationData();
            activeLoansCache = []; // Limpa cache para forçar a atualização da lista
            loadActiveLoansAdmin({});
        } else {
            // Tratamento específico para o erro de data de devolução inválida
            if (response.status === 422 && result.detail && Array.isArray(result.detail)) {
                const dataError = result.detail.find(err => err.msg && err.msg.includes('data de devolução prevista deve ser posterior'));
                if (dataError) {
                    const customErrorMsg = extractApiErrorMessage(result); // Usa a função utilitária
                    showMessage(containerId, customErrorMsg, true);
                    return;
                }
            }
            const errorMsg = extractApiErrorMessage(result);
            showMessage(containerId, `❌ Falha ao registrar empréstimo: ${errorMsg}`, true);
        }
    } catch (error) {
        showMessage(containerId, 'Erro de conexão com a API ao registrar empréstimo.', true);
        console.error("Erro ao criar empréstimo:", error);
    }
}

// READ/FILTER (Carrega empréstimos para o painel de gerenciamento)
async function loadActiveLoansAdmin(filters = {}) {
    const loansList = document.getElementById('loans-list');
    if (!loansList) return;

    loansList.innerHTML = '<p class="loading-message">Carregando empréstimos...</p>';

    const token = localStorage.getItem('token');

    const leitorIdFiltro = filters.leitor_id;
    let url = `${API_URL}/emprestimos/`; // Busca todos por padrão
    if (leitorIdFiltro) {
        url = `${API_URL}/emprestimos/leitor/${leitorIdFiltro}`; // Busca por leitor específico
    }

    // Verifica se o cache está vazio OU se a URL de busca mudou (ex: mudou o filtro de leitor)
    const shouldReloadFromApi = activeLoansCache.length === 0 || activeLoansCache.__url !== url;

    try {
        if (shouldReloadFromApi) {
            const response = await fetch(url, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });

            const emprestimos = await response.json();

            if (!response.ok) {
                // Trata o caso 404 de "Empréstimo não encontrado"
                if (response.status === 404 && emprestimos.detail && emprestimos.detail.includes("Empréstimo não encontrado")) {
                     loansList.innerHTML = '<p class="empty-message">Nenhum empréstimo encontrado para os critérios de busca.</p>';
                     activeLoansCache = [];
                     return;
                }
                 loansList.innerHTML = `<p class="error-message">Erro ao carregar empréstimos: ${emprestimos.detail || 'Falha na API'}</p>`;
                 activeLoansCache = [];
                 return;
            }

            // Atualiza o cache com a nova lista e a URL de onde ela veio
            activeLoansCache = emprestimos;
            activeLoansCache.__url = url;
        }

        // Aplica filtros locais (data e status) ao cache
        const filteredLoans = applyLoanFilters(activeLoansCache, filters);
        // Renderiza o resultado
        renderLoans(filteredLoans, loansList);

    } catch (error) {
        console.error('Erro de conexão ao buscar empréstimos:', error);
        loansList.innerHTML = '<p class="error-message">Falha de conexão com a API.</p>';
    }
}

/**
 * Aplica filtros locais (Data e Status) à lista de empréstimos em cache.
 * @param {Array<Object>} loans - Lista de empréstimos.
 * @param {Object} filters - Objeto contendo { data_devolucao, status }.
 * @returns {Array<Object>} Lista de empréstimos filtrada.
 */
function applyLoanFilters(loans, filters) {
    let filtered = loans;

    // Filtro de Data de Devolução Prevista
    const dataPrevista = filters.data_devolucao ? new Date(filters.data_devolucao) : null;
    if (dataPrevista) dataPrevista.setHours(23, 59, 59, 999);

    const statusFiltro = filters.status;

    if (dataPrevista) {
        filtered = filtered.filter(loan => {
            const loanDate = new Date(loan.data_devolucao_prevista);
            // Filtra empréstimos cuja previsão de devolução seja MENOR ou IGUAL à data selecionada
            return loanDate <= dataPrevista;
        });
    }

    // Filtro por Status
    if (statusFiltro) {

        filtered = filtered.filter(loan => {
            const isOverdue = loan.is_atrasado;
            const apiStatus = (loan.status_emprestimo || '').toLowerCase();

            const isAtivo = apiStatus === 'emprestado';
            // Finalizado é sinônimo de devolvido na lógica de exibição
            const isDevolvido = apiStatus === 'devolvido' || apiStatus === 'finalizado';

            if (statusFiltro === "Atrasado") {
                // Ativo E atrasado
                return isOverdue;

            } else if (statusFiltro === "Devolvido") {
                return isDevolvido;

            } else if (statusFiltro === "Emprestado") {
                // Ativo E não atrasado (em dia)
                return isAtivo && !isOverdue;
            }

            // Se o status for "Todos os Status" ou desconhecido, retorna true
            return true;
        });
    }

    return filtered;
}

/**
 * Renderiza os empréstimos como cards no painel de gerenciamento.
 * Utiliza funções auxiliares (getDetails) para buscar Título do Livro e Nome do Leitor.
 */
async function renderLoans(emprestimos, loansList) {
    loansList.innerHTML = '';

    if (emprestimos.length === 0) {
        loansList.innerHTML = '<p class="empty-message">Nenhum empréstimo que corresponda aos filtros.</p>';
        return;
    }

    // Cache local de detalhes para evitar requisições repetidas na renderização
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

    // Processa os empréstimos em paralelo
    const renderPromises = emprestimos.map(async emprestimo => {
        const card = document.createElement('div');
        card.classList.add('loan-card');

        const apiStatus = (emprestimo.status_emprestimo || '').toLowerCase();

        // Busca detalhes necessários
        const livroTitulo = await getDetails(emprestimo.livro_id, 'livro');
        const leitorNome = await getDetails(emprestimo.leitor_id, 'leitor');

        const dataDevolucaoPrevista = new Date(emprestimo.data_devolucao_prevista);

        const isDevolvido = apiStatus === 'devolvido' || apiStatus === 'finalizado';
        const isOverdue = emprestimo.is_atrasado; // Usando a propriedade calculada da API

        let statusDisplay = '';
        let dueDateClass = '';

        let dataLabel = 'Previsão de Devolução';
        // Define a data a ser exibida: real se devolvido, prevista caso contrário
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

        // Botão de finalização (Devolução) só aparece se o empréstimo não foi devolvido
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

        // Anexa o listener de clique ao botão de devolução
        if (!isDevolvido) {
            card.querySelector('.btn-finish-loan').addEventListener('click', (e) => {
                const loanId = e.currentTarget.getAttribute('data-id');
                handleFinishLoan(loanId);
            });
        }
    });

    await Promise.all(renderPromises);
}

// UPDATE (Finalizar/Devolver Empréstimo)
async function handleFinishLoan(loanId) {
    const token = localStorage.getItem('token');
    const bibliotecarioId = localStorage.getItem('user_id');
    const containerId = 'loan-create-form-container';

    if (!bibliotecarioId) {
        showMessage(containerId, '❌ Erro: ID do Bibliotecário não encontrado. Faça login novamente.', true);
        return;
    }

    const url = `${API_URL}/emprestimos/${loanId}/devolver`;

    const confirmed = await customConfirm(
        'Confirmar Devolução',
        `Confirma a devolução do Empréstimo ID ${loanId}?`,
        'CONFIRMAR DEVOLUÇÃO'
    );

    if (!confirmed) {
        return;
    }

    // Prepara os dados de devolução (ID do bibliotecário e data atual)
    const bodyData = {
        bibliotecario_devolucao_id: parseInt(bibliotecarioId),
        data_devolucao_real: new Date().toISOString() // Data ISO atual
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
            showMessage(containerId, `✅ Empréstimo ID ${loanId} finalizado com sucesso!`, false);

            // Atualiza o painel
            loadSummaryData();
            loadLoanCreationData();
            activeLoansCache = []; // Limpa cache
            loadActiveLoansAdmin({}); // Recarrega a lista
        } else {
            const errorMsg = extractApiErrorMessage(result);
            showMessage(containerId, `❌ Falha ao finalizar empréstimo: ${errorMsg}`, true);
            console.error('Detalhe do erro API:', result);
        }

    } catch (error) {
        console.error('Erro de rede ao finalizar empréstimo:', error);
        showMessage(containerId, '❌ Erro de conexão ao tentar finalizar o empréstimo.', true);
    }
}


// ====================================================================
// 🔍 CATÁLOGO DE CONSULTA (Admin) e FUNÇÕES DE DETALHES
// ====================================================================

/**
 * Busca o nome do Autor pelo ID. (Utilizado no Catálogo Admin)
 */
async function fetchAuthorDetails(autorId) {
    const token = localStorage.getItem('token');
    const url = `${API_URL}/autores/${autorId}`;
    try {
        const response = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await response.json();
        // Lida com API que pode retornar lista ou objeto
        const autorObj = Array.isArray(data) ? data[0] : data;
        return (autorObj && autorObj.nome) ? `${autorObj.nome} ${autorObj.sobrenome || ''}`.trim() : 'Autor Desconhecido';
    } catch (error) {
        return 'Erro de Conexão';
    }
}

/**
 * Carrega e exibe todos os livros no catálogo de consulta (Admin).
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

        // Renderiza os cards de livros
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
 * Busca o nome do Leitor (Usuário) pelo ID. (Utilizado na renderização de Empréstimos)
 */
async function fetchLeitorDetails(leitorId) {
    const token = localStorage.getItem('token');
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
 * Busca o título do Livro pelo ID. (Utilizado na renderização de Empréstimos)
 */
async function fetchLivroDetails(livroId) {
    const token = localStorage.getItem('token');
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


// ====================================================================
// 📊 DASHBOARD HOME (Dados de Resumo)
// ====================================================================

/**
 * Carrega dados de resumo (total de livros, leitores, atrasados) para a tela Home do Dashboard.
 */
async function loadSummaryData() {
    const token = localStorage.getItem('token');

    // 1. Total de Livros (Soma do número de cópias)
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

    // 2. Leitores Ativos (Total de leitores cadastrados)
    try {
        const response = await fetch(`${API_URL}/usuarios/leitores/`, { headers: { 'Authorization': `Bearer ${token}` } });
        const leitores = await response.json();
        document.getElementById('active-readers').textContent = Array.isArray(leitores) ? leitores.length : '...';
    } catch (e) {
        document.getElementById('active-readers').textContent = '...';
    }

    // 3. Empréstimos Atrasados
    try {
        const response = await fetch(`${API_URL}/emprestimos/`, { headers: { 'Authorization': `Bearer ${token}` } });
        const allLoans = await response.json();

        if (response.ok && Array.isArray(allLoans)) {
            // Filtra apenas os empréstimos ativos (não devolvidos)
            const activeLoans = allLoans.filter(loan => (loan.status_emprestimo || '').toLowerCase() === 'emprestado');

            // Conta quantos estão atrasados (data_devolucao_prevista é menor que hoje)
            const overdueCount = activeLoans.filter(loan => {
                const dataDevolucao = new Date(loan.data_devolucao_prevista);
                const hoje = new Date();
                // Normaliza as datas para comparação apenas no dia
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


// ====================================================================
// 🚀 LÓGICA DE INICIALIZAÇÃO DA PÁGINA (DOMContentLoaded)
// ====================================================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. CARREGAR DADOS DO USUÁRIO E ID
    const userName = localStorage.getItem('user_name');
    const userIdString = localStorage.getItem('user_id');
    const userNameElement = document.getElementById('user-name');
    const userAvatarElement = document.getElementById('user-avatar-initial');

    // Define o ID do bibliotecário logado
    if (userIdString) {
        BIBLIOTECARIO_ID = parseInt(userIdString);
    }

    // Exibe o nome e a inicial do usuário
    if (userName && userNameElement && userAvatarElement) {
        userNameElement.textContent = userName;
        userAvatarElement.textContent = userName.charAt(0).toUpperCase();
    } else {
        userNameElement.textContent = 'Bibliotecário';
        userAvatarElement.textContent = 'B';
    }

    // 2. CONFIGURAR NAVEGAÇÃO DA SIDEBAR (Ativação de Seções)
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
        window.location.href = '../skeleton/index.html'; // Redireciona para o login
    });

    // 4. CONFIGURAR SUBMISSÕES DE FORMULÁRIO (CREATE/DELETE)
    // Gerenciar Autores
    document.getElementById('create-author-form')?.addEventListener('submit', createAuthor);
    document.getElementById('delete-author-form')?.addEventListener('submit', deleteAuthor);

    // Gerenciar Livros
    document.getElementById('create-book-form')?.addEventListener('submit', createBook);
    document.getElementById('delete-book-form')?.addEventListener('submit', deleteBook);

    // Gerenciar Gêneros
    document.getElementById('create-genre-form')?.addEventListener('submit', createGenre);
    document.getElementById('delete-genre-form')?.addEventListener('submit', deleteGenre);

    // Gerenciar Empréstimos (Criação)
    document.getElementById('create-loan-form')?.addEventListener('submit', createLoan);

    // 5. CONFIGURAR FILTROS DE EMPRÉSTIMO
    document.getElementById('apply-loan-filters')?.addEventListener('click', () => {
        // Coleta os filtros do formulário
        const filters = {
            leitor_id: document.getElementById('filter-leitor-id').value,
            data_devolucao: document.getElementById('filter-data-devolucao').value,
            status: document.getElementById('filter-status').value
        };
        // Aplica os filtros e recarrega a lista
        loadActiveLoansAdmin(filters);
    });


    // 6. CARREGAR DADOS INICIAIS DA HOME
    // Inicializa a Home e carrega os dados de resumo
    loadSummaryData();
    activateSection('dashboard-home');
});