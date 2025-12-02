# 📚 GestBook: Sistema de Gestão de Bibliotecas

## 🌟 Visão Geral do Projeto

**GestBook** é uma plataforma robusta desenvolvida para **facilitar a gestão completa de acervos e empréstimos** em bibliotecas. O sistema oferece interfaces dedicadas para bibliotecários (administração e CRUD) e leitores (consulta e histórico), garantindo controle de estoque, segurança por perfil de usuário e validação de dados em tempo real.

O principal objetivo do GestBook é **automatizar o controle de cópias e o registro de transações**, fornecendo filtros avançados e alertas de atraso para uma operação eficiente da biblioteca.

---

## ✨ Tecnologias Utilizadas

| Categoria | Tecnologia | Uso Principal |
| :--- | :--- | :--- |
| **Backend (API)** | **FastAPI** | Roteamento de API, validação de dados e segurança (JWT). |
| **Banco de Dados** | **PostgreSQL** | Armazenamento persistente e relacional de todo o acervo e transações. |
| **ORM** | **SQLAlchemy** | Mapeamento Objeto-Relacional para interagir com o PostgreSQL. |
| **Frontend** | **HTML5, CSS3, JavaScript (Vanilla)** | Interface do usuário e lógica de navegação/interação. |
| **Segurança** | **JWT, Passlib (Argon2)** | Autenticação, Autorização (*Role-Based Access Control*) e *Hashing* seguro de senhas. |
| **Ambiente** | **Python Venv, Uvicorn** | Virtualização de dependências e servidor ASGI para FastAPI. |

---

## 🏗️ Estrutura do Banco de Dados (PostgreSQL)

O esquema do banco de dados foi projetado para garantir a integridade transacional e a flexibilidade no acervo, especialmente através da relação **Muitos-Para-Muitos** entre Livros e Gêneros.

| Tabela | Descrição | Regras de Negócio Chave |
| :--- | :--- | :--- |
| **`usuarios`** | Leitores e Bibliotecários. | `role` definida ('leitor' ou 'bibliotecario'). |
| **`autores`** | Informações sobre autores. | `data_nascimento` não pode ser futura. |
| **`livro`** | Acervo, ISBN e controle de cópias. | `numero_copias >= 0`, `ano_publicacao` não pode ser futuro. |
| **`emprestimo`** | Transações. | `data_devolucao_prevista > data_emprestimo`. |
| **`livros_generos`** | Associação M:N. | Exclusão do Livro resulta em exclusão em cascata da associação. |

---

## 🔑 Funcionalidades e Controle de Estoque

### Módulo de Autenticação (/auth)
* **Registro de Novos Usuários** (Leitores) e Login por E-mail/Senha.

* **Autorização por Papel (Role):** O acesso a rotas administrativas é estritamente controlado para o perfil bibliotecario.

### Dashboard do Leitor (Acesso Rápido e Consulta)
* **Catálogo Interativo:** Busca por Título/Autor e filtros dinâmicos por Gênero.

* **Meus Empréstimos:** Histórico e status com alertas visuais para livros Atrasados.

---

## 🔐 Dashboard do Bibliotecário (Administração e CRUD)

O módulo administrativo implementa a lógica de negócio central do sistema:

| Funcionalidade | Endpoint (CRUD) | Controle de Estoque/Segurança |
| :--- | :--- | :--- |
| **Gestão de Acervos** | `/autores/`, `/generos/`, `/livros/` | Criação e atualização de todos os componentes do acervo. |
| **Criação de Empréstimos** | `POST /emprestimos/` | **Decrementa o estoque** do livro em tempo real. |
| **Finalizar Devolução** | `POST /emprestimos/{id}/devolver` | **Incrementa o estoque** e registra o bibliotecário que realizou a devolução. |
| **Exclusão Segura** | `DELETE /livros/{id}/com-emprestimos` | Requer que todos os empréstimos do livro estejam como `DEVOLVIDO` antes de permitir a exclusão total. |
| **Consulta de Transações**| `GET /emprestimos/` | Listagem completa de todos os empréstimos, ativação de filtros de status e leitor. |

---

## 👤 Contato
Para dúvidas, entre em contato:

Ulisses S. Filho - 007259@libertas.edu.br
