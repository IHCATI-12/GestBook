// ====================================================================
// 📚 CONFIGURAÇÃO BACKEND E FUNÇÕES DE APOIO (Globais)
// Essas funções são definidas antes do carregamento do DOM e podem ser
// usadas por qualquer parte do código.
// ====================================================================

/**
 * URL base da API de autenticação.
 * Todos os endpoints de login e registro serão construídos a partir desta URL.
 */
const API_URL = "http://127.0.0.1:8000/auth";

// --- Funções Auxiliares ---

/**
 * Tenta parsear a resposta HTTP para JSON de forma segura.
 * Retorna um objeto vazio `{}` em caso de erro de parsing,
 * garantindo que o código não quebre.
 * @param {Response} response Objeto Response da API Fetch.
 * @returns {Promise<object>} Os dados JSON ou um objeto vazio.
 */
async function safeJson(response) {
    try {
        return await response.json();
    } catch {
        // Retorna um objeto vazio se a resposta não for um JSON válido
        return {};
    }
}

/**
 * Formata e traduz as mensagens de erro detalhadas retornadas pela API (FastAPI/Pydantic).
 * Inclui traduções específicas para regras de validação comuns (e-mail, senha, nome).
 * @param {object} data Os dados da resposta de erro da API.
 * @returns {string} Uma mensagem de erro formatada e amigável para o usuário.
 */
function formatErrorMessage(data) {
    // Verifica se existe um array de erros detalhados
    if (Array.isArray(data?.detail)) {
        // Mapeia cada erro para uma string de mensagem
        return data.detail.map(err => {
            // Pega o nome do campo (último elemento do array 'loc') ou usa "Erro"
            const field = err.loc ? err.loc[err.loc.length - 1] : "Erro";

            // Aplica traduções específicas para a interface do usuário
            if (field === 'email' && err.msg.includes('@-sign')) {
                return 'Por favor, insira um endereço de e-mail válido.';
            }
            if (field === 'senha' && err.msg.includes('at least 6 characters')) {
                return 'A senha deve ter no mínimo 6 caracteres.';
            }
            if (field === 'nome' && err.msg.includes('at least 1 character')) {
                return 'Nome: O campo Nome é obrigatório.';
            }
            // Retorno padrão se nenhuma regra específica for aplicada
            return `${field}: ${err.msg}`;
        }).join(" | "); // Une todas as mensagens de erro em uma única string
    }
    // Retorno se 'detail' for uma string ou um erro desconhecido
    return data?.detail || "Erro desconhecido ao processar sua requisição.";
}

/**
 * Exibe uma notificação "toast" temporária no canto da tela.
 * @param {string} message A mensagem a ser exibida.
 */
function showToast(message) {
    // Cria o elemento da notificação
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;

    // Adiciona ao corpo do documento
    document.body.appendChild(toast);

    // Pequeno atraso para garantir que a transição CSS seja aplicada
    setTimeout(() => toast.classList.add("show"), 20);

    // Oculta e remove o toast após um tempo
    setTimeout(() => {
        toast.classList.remove("show"); // Inicia a transição de saída
        setTimeout(() => toast.remove(), 300); // Remove o elemento após a transição
    }, 2500);
}

/**
 * Exibe mensagens de feedback (erro ou sucesso) dentro dos formulários.
 * @param {string} elementId O ID do elemento onde a mensagem será exibida (ex: 'reg_msg').
 * @param {string} message O texto da mensagem.
 * @param {('error'|'success')} [type='error'] O tipo de mensagem para estilização.
 */
function showFormMessage(elementId, message, type = "error") {
    const el = document.getElementById(elementId);
    if (!el) return; // Sai se o elemento não for encontrado

    // Define a classe para estilização e o texto da mensagem
    el.className = `form-msg ${type}`;
    el.innerText = message;
    el.style.display = "block"; // Torna o elemento visível

    // Para mensagens de sucesso, oculta automaticamente após 5 segundos
    if (type === "success") {
        setTimeout(() => el.style.display = "none", 5000);
    }
}


// ====================================================================
// 🚀 LÓGICA DE EXECUÇÃO (GARANTIDA VIA DOMContentLoaded)
// O código abaixo só será executado quando todo o HTML estiver carregado.
// ====================================================================
document.addEventListener("DOMContentLoaded", () => {

    // ------------------------------------
    // 🎨 ANIMAÇÃO DE TROCA DE TELA (Painel)
    // ------------------------------------
    const signUpButton = document.getElementById("signUp");
    const signInButton = document.getElementById("signIn");
    const container = document.getElementById("container");

    // Adiciona listeners para alternar as classes CSS (para animação)
    if (signUpButton && signInButton && container) {
        // Move para o painel de Registro/Cadastro
        signUpButton.addEventListener("click", () => {
            container.classList.add("right-panel-active");
        });

        // Move para o painel de Login/Entrar
        signInButton.addEventListener("click", () => {
            container.classList.remove("right-panel-active");
        });
    }

    // ------------------------------------
    // 📝 REGISTRO DE USUÁRIO
    // ------------------------------------
    const btnRegistrar = document.getElementById("btn_registrar");

    if (btnRegistrar) {
        btnRegistrar.addEventListener("click", async (e) => {
            e.preventDefault(); // Impede o envio padrão do formulário

            // Captura os valores dos campos de registro, removendo espaços
            const nome = document.getElementById("reg_nome")?.value.trim();
            const email = document.getElementById("reg_email")?.value.trim();
            const senha = document.getElementById("reg_senha")?.value.trim();
            // Captura o valor do radio button de tipo de usuário selecionado
            const userTypeRadio = document.querySelector('input[name="user_type"]:checked');

            // Validação local básica de campos obrigatórios
            if (!nome || !email || !senha || !userTypeRadio) {
                showFormMessage("reg_msg", "Preencha todos os campos obrigatórios.", "error");
                return;
            }
            const role = userTypeRadio.value;

            // Prepara o corpo da requisição e oculta mensagens anteriores
            const payload = { nome, email, senha, role };
            document.getElementById("reg_msg").style.display = "none";

            try {
                // Requisição assíncrona para o endpoint de registro
                const resp = await fetch(`${API_URL}/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                const data = await safeJson(resp); // Tenta parsear a resposta JSON

                // Verifica se a resposta HTTP não foi bem-sucedida (status 4xx ou 5xx)
                if (!resp.ok) {
                    const errorMessage = formatErrorMessage(data);
                    showFormMessage("reg_msg", errorMessage, "error");
                    return;
                }

                // Lógica de sucesso no registro: feedback e limpeza de campos
                showFormMessage("reg_msg", "Usuário registrado com sucesso! Faça login.", "success");
                showToast("✅ Cadastro realizado com sucesso!");

                // Limpa os campos após um registro bem-sucedido
                document.getElementById("reg_nome").value = "";
                document.getElementById("reg_email").value = "";
                document.getElementById("reg_senha").value = "";

            } catch (err) {
                // Trata erros de rede (ex: API offline, problemas de CORS)
                showFormMessage("reg_msg", "Erro ao conectar com o servidor. Verifique a API.", "error");
            }
        });
    }

    // ------------------------------------
    // 🔑 LOGIN DE USUÁRIO
    // ------------------------------------
    const btnLogin = document.getElementById("btn_login");

    if (btnLogin) {
        btnLogin.addEventListener("click", async (e) => {
            e.preventDefault(); // Impede o envio padrão do formulário

            // Captura os valores dos campos de login, removendo espaços
            const email = document.getElementById("log_email")?.value.trim();
            const senha = document.getElementById("log_senha")?.value.trim();

            // Validação local básica de campos obrigatórios
            if (!email || !senha) {
                showFormMessage("log_msg", "E-mail e senha são obrigatórios.", "error");
                return;
            }

            // Prepara o corpo da requisição e oculta mensagens anteriores
            const payload = { email, senha };
            document.getElementById("log_msg").style.display = "none";

            try {
                // Requisição assíncrona para o endpoint de login
                const resp = await fetch(`${API_URL}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                const data = await safeJson(resp); // Tenta parsear a resposta JSON

                // Verifica se a resposta HTTP não foi bem-sucedida (status 4xx ou 5xx)
                if (!resp.ok) {
                    const errorMessage = formatErrorMessage(data);
                    showFormMessage("log_msg", errorMessage, "error");
                    return;
                }

                // --- Lógica de Sucesso no Login ---

                // Armazena dados essenciais no LocalStorage para uso futuro (sessão)
                localStorage.setItem("token", data.token); // Token de autenticação
                localStorage.setItem("role", data.role); // Nível de acesso (leitor/bibliotecário)
                localStorage.setItem("user_name", data.nome); // Nome do usuário
                localStorage.setItem("user_id", data.id); // ID do usuário (Adicionado/Corrigido)

                // Feedback de boas-vindas
                showToast(`Bem-vindo, ${data.nome.split(' ')[0]}!`);

                // Determina a página de redirecionamento com base na "role"
                const role = data.role.toLowerCase();
                let redirectPage = "../skeleton/dashboard_leitor.html"; // Padrão

                if (role === 'bibliotecario') {
                    redirectPage = "../skeleton/dashboard_bibliotecario.html";
                }

                // Redireciona o usuário após um pequeno atraso
                setTimeout(() => {
                    window.location.href = redirectPage;
                }, 600);

            } catch (err) {
                // Trata erros de rede (ex: API offline, problemas de CORS)
                showFormMessage("log_msg", "Erro ao conectar com o servidor. Verifique a API.", "error");
            }
        });
    }
});