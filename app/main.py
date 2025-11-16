from fastapi import FastAPI
from app.routers.usuarios_routers import router
from app.routers.autenticacao_routers import router as auth_router

app = FastAPI()

@app.get("/")
def root():
    return {"Aplicação": "Online"}


# rotas de usuários
app.include_router(router)  # Certifique-se de importar 'router' do módulo correto

# rotas de autenticação
app.include_router(auth_router)


