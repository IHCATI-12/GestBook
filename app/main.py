from fastapi import FastAPI
from app.routers.usuarios_routers import router as usuario_router
from app.routers.autenticacao_routers import router as auth_router
from app.routers.livro_routers import router as livro_router
from app.routers.autores_routers import router as autor_router
from app.routers.emprestimo_routers import router as emprestimo_router
from app.routers.generos_routers import router as generos_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

@app.get("/")
def root():
    return {"Aplicação": "Online"}

# Configuração do CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Permite todas as origens, ajuste conforme necessário
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# rotas de usuários
app.include_router(usuario_router)

# rotas de autenticação
app.include_router(auth_router)

# rotas de livros
app.include_router(livro_router)

# rotas de autores
app.include_router(autor_router)

# rotas de empréstimos
app.include_router(emprestimo_router)

# Adiciona o roteador de gêneros
app.include_router(generos_router)  
