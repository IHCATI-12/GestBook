from fastapi import FastAPI
from app.routers.usuarios_routers import router as usuario_router
from app.routers.autenticacao_routers import router as auth_router
from app.routers.livro_routers import router as livro_router
from app.routers.autores_routers import router as autor_router

app = FastAPI()

@app.get("/")
def root():
    return {"Aplicação": "Online"}

# rotas de usuários
app.include_router(usuario_router)

# rotas de autenticação
app.include_router(auth_router)

# rotas de livros
app.include_router(livro_router)

# rotas de autores
app.include_router(autor_router)


