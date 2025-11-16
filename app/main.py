from fastapi import FastAPI
from app.routers.usuarios_routers import router

app = FastAPI()

@app.get("/")
def root():
    return {"Aplicação": "Online"}

app.include_router(router)  # Certifique-se de importar 'router' do módulo correto
