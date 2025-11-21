// -------------------------------
// ANIMAÇÃO DE TROCA DE TELA (Mantido)
// -------------------------------
const signUpButton = document.getElementById("signUp");
const signInButton = document.getElementById("signIn");
const container = document.getElementById("container");

signUpButton.addEventListener("click", () => {
    container.classList.add("right-panel-active");
});

signInButton.addEventListener("click", () => {
    container.classList.remove("right-panel-active");
});

// -------------------------------
// CONFIGURAÇÃO BACKEND
// -------------------------------
const API_URL = "http://127.0.0.1:8000/auth";


// -------------------------------
// FUNÇÕES DE APOIO (Atualizadas para formatar array de erros)
// -------------------------------

// Tratamento seguro de JSON para evitar erros de parsing
async function safeJson(response) {
    try {
        return await response.json();
    } catch {
        return {};
    }
}

// Formata a mensagem de erro da API. Se for um array de objetos, lista eles.
function formatErrorMessage(data) {
    if (Array.isArray(data?.detail)) {
        // Assume que 'detail' é um array de objetos de erro (como em validação Pydantic)
        return data.detail.map(err => {
            // Se houver "loc" (location), mostra o campo. Ex: "Email: campo inválido"
            const field = err.loc ? err.loc[err.loc.length - 1] : "Erro";
            // --- REGRA DE PERSONALIZAÇÃO DE E-MAIL ---
            if (field === 'email' && err.msg.includes('@-sign')) {
                return 'Por favor, insira um endereço de e-mail válido.';
            }

            // --- NOVA REGRA DE PERSONALIZAÇÃO DE SENHA ---
            if (field === 'senha' && err.msg.includes('at least 6 characters')) {
                return 'A senha deve ter no mínimo 6 caracteres.';
            }
            // --- NOVA REGRA DE PERSONALIZAÇÃO DE NOME ---
            if (field === 'nome' && err.msg.includes('at least 1 character')) {
                return 'Nome: O campo Nome é obrigatório.';
            }
            // ------------------------------------
            return `${field}: ${err.msg}`;
        }).join(" | ");
    }
    // Retorna a mensagem padrão ou uma string vazia
    return data?.detail || "Erro desconhecido ao processar sua requisição.";
}

// Notificação Toast
function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;

    document.body.appendChild(toast);

    // Usa um pequeno delay para garantir a transição
    setTimeout(() => toast.classList.add("show"), 20);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// Mensagens dentro do formulário
function showFormMessage(elementId, message, type = "error") {
    const el = document.getElementById(elementId);
    el.className = `form-msg ${type}`;
    el.innerText = message;
    el.style.display = "block";
    // Oculta após 5 segundos, a não ser que seja um erro
    if (type === "success") {
         setTimeout(() => el.style.display = "none", 5000);
    }
}


// -------------------------------
// REGISTRO DE USUÁRIO (Atualizado para usar formatErrorMessage)
// -------------------------------
document.getElementById("btn_registrar").addEventListener("click", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("reg_nome").value.trim();
    const email = document.getElementById("reg_email").value.trim();
    const senha = document.getElementById("reg_senha").value.trim();
    const role = document.querySelector('input[name="user_type"]:checked').value;

    const payload = { nome, email, senha, role };
    document.getElementById("reg_msg").style.display = "none"; // Limpa mensagens anteriores

    try {
        const resp = await fetch(`${API_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await safeJson(resp);

        if (!resp.ok) {
            // Usa a função de formatação para exibir erros legíveis
            const errorMessage = formatErrorMessage(data);
            showFormMessage("reg_msg", errorMessage, "error");
            return;
        }

        showFormMessage("reg_msg", "Usuário registrado com sucesso! Faça login.", "success");
        showToast("✅ Cadastro realizado com sucesso!");

        // Opcional: Limpa os campos após o registro
        document.getElementById("reg_nome").value = "";
        document.getElementById("reg_email").value = "";
        document.getElementById("reg_senha").value = "";

    } catch (err) {
        showFormMessage("reg_msg", "Erro ao conectar com o servidor. Verifique a API.", "error");
    }
});


// -------------------------------
// LOGIN DE USUÁRIO (Atualizado para redirecionamento condicional)
// -------------------------------
document.getElementById("btn_login").addEventListener("click", async (e) => {
    e.preventDefault();

    const email = document.getElementById("log_email").value.trim();
    const senha = document.getElementById("log_senha").value.trim();

    const payload = { email, senha };
    document.getElementById("log_msg").style.display = "none"; // Limpa mensagens anteriores

    try {
        const resp = await fetch(`${API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const data = await safeJson(resp);

        if (!resp.ok) {
            // Usa a função de formatação para exibir erros legíveis
            const errorMessage = formatErrorMessage(data);
            showFormMessage("log_msg", errorMessage, "error");
            return;
        }

        // --- Lógica de Sucesso ---

        // Salva informações no navegador
        localStorage.setItem("token", data.token);
        localStorage.setItem("role", data.role);
        localStorage.setItem("nome", data.nome);


        // Redirecionamento condicional
        const role = data.role.toLowerCase();
        let redirectPage = "../pages/dashboard.html"; // Padrão
        
        if (role === 'bibliotecario') {
            redirectPage = "../pages/bibliotecario/dashboard.html";
        } else if (role === 'leitor') {
            redirectPage = "../pages/leitor/dashboard.html";
        }

        // Redireciona
        setTimeout(() => {
            window.location.href = redirectPage;
        }, 600);

    } catch (err) {
        showFormMessage("log_msg", "Erro ao conectar com o servidor. Verifique a API.", "error");
    }
});