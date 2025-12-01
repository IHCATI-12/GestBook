// -------------------------------
// CONFIGURAÇÃO BACKEND E FUNÇÕES DE APOIO (Definidas fora do DOMContentLoaded)
// -------------------------------
const API_URL = "http://127.0.0.1:8000/auth";

// Tratamento seguro de JSON para evitar erros de parsing
async function safeJson(response) {
    try {
        return await response.json();
    } catch {
        return {};
    }
}

// Formata a mensagem de erro da API.
function formatErrorMessage(data) {
    if (Array.isArray(data?.detail)) {
        return data.detail.map(err => {
            const field = err.loc ? err.loc[err.loc.length - 1] : "Erro";

            if (field === 'email' && err.msg.includes('@-sign')) {
                return 'Por favor, insira um endereço de e-mail válido.';
            }
            if (field === 'senha' && err.msg.includes('at least 6 characters')) {
                return 'A senha deve ter no mínimo 6 caracteres.';
            }
            if (field === 'nome' && err.msg.includes('at least 1 character')) {
                return 'Nome: O campo Nome é obrigatório.';
            }
            return `${field}: ${err.msg}`;
        }).join(" | ");
    }
    return data?.detail || "Erro desconhecido ao processar sua requisição.";
}

// Notificação Toast
function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerText = message;

    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 20);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 2500);
}

// Mensagens dentro do formulário (Restaurado e Corrigido)
function showFormMessage(elementId, message, type = "error") {
    const el = document.getElementById(elementId);
    if (!el) return; // Segurança extra caso o ID não exista

    el.className = `form-msg ${type}`;
    el.innerText = message;
    el.style.display = "block";

    // Oculta após 5 segundos
    if (type === "success") {
        setTimeout(() => el.style.display = "none", 5000);
    }
}


// -----------------------------------------------------
// 🚀 LÓGICA DE EXECUÇÃO (GARANTIDA VIA DOMContentLoaded)
// -----------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {

    // -------------------------------
    // ANIMAÇÃO DE TROCA DE TELA 
    // -------------------------------
    const signUpButton = document.getElementById("signUp");
    const signInButton = document.getElementById("signIn");
    const container = document.getElementById("container");

    if (signUpButton && signInButton && container) {
        signUpButton.addEventListener("click", () => {
            container.classList.add("right-panel-active");
        });

        signInButton.addEventListener("click", () => {
            container.classList.remove("right-panel-active");
        });
    }


    // -------------------------------
    // REGISTRO DE USUÁRIO
    // -------------------------------
    const btnRegistrar = document.getElementById("btn_registrar");

    if (btnRegistrar) {
        btnRegistrar.addEventListener("click", async (e) => {
            e.preventDefault();

            const nome = document.getElementById("reg_nome")?.value.trim();
            const email = document.getElementById("reg_email")?.value.trim();
            const senha = document.getElementById("reg_senha")?.value.trim();
            const userTypeRadio = document.querySelector('input[name="user_type"]:checked');

            if (!nome || !email || !senha || !userTypeRadio) {
                showFormMessage("reg_msg", "Preencha todos os campos obrigatórios.", "error");
                return;
            }
            const role = userTypeRadio.value;

            const payload = { nome, email, senha, role };
            document.getElementById("reg_msg").style.display = "none";

            try {
                const resp = await fetch(`${API_URL}/register`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                const data = await safeJson(resp);

                if (!resp.ok) {
                    const errorMessage = formatErrorMessage(data);
                    showFormMessage("reg_msg", errorMessage, "error");
                    return;
                }

                showFormMessage("reg_msg", "Usuário registrado com sucesso! Faça login.", "success");
                showToast("✅ Cadastro realizado com sucesso!");

                document.getElementById("reg_nome").value = "";
                document.getElementById("reg_email").value = "";
                document.getElementById("reg_senha").value = "";

            } catch (err) {
                showFormMessage("reg_msg", "Erro ao conectar com o servidor. Verifique a API.", "error");
            }
        });
    }
    // -------------------------------
    // LOGIN DE USUÁRIO
    // -------------------------------
    const btnLogin = document.getElementById("btn_login");

    if (btnLogin) {
        btnLogin.addEventListener("click", async (e) => {
            e.preventDefault();

            const email = document.getElementById("log_email")?.value.trim();
            const senha = document.getElementById("log_senha")?.value.trim();

            if (!email || !senha) {
                showFormMessage("log_msg", "E-mail e senha são obrigatórios.", "error");
                return;
            }

            const payload = { email, senha };
            document.getElementById("log_msg").style.display = "none";

            try {
                const resp = await fetch(`${API_URL}/login`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                const data = await safeJson(resp);

                if (!resp.ok) {
                    const errorMessage = formatErrorMessage(data);
                    showFormMessage("log_msg", errorMessage, "error");
                    return;
                }

                // --- Lógica de Sucesso CORRIGIDA ---
                localStorage.setItem("token", data.token);
                localStorage.setItem("role", data.role);
                localStorage.setItem("user_name", data.nome);
                localStorage.setItem("user_id", data.id); // <<< LINHA ADICIONADA/CORRIGIDA

                showToast(`Bem-vindo, ${data.nome.split(' ')[0]}!`);

                const role = data.role.toLowerCase();
                let redirectPage = "../skeleton/dashboard_leitor.html";

                if (role === 'bibliotecario') {
                    redirectPage = "../skeleton/dashboard_bibliotecario.html";
                }

                setTimeout(() => {
                    window.location.href = redirectPage;
                }, 600);

            } catch (err) {
                showFormMessage("log_msg", "Erro ao conectar com o servidor. Verifique a API.", "error");
            }
        });
    }
});