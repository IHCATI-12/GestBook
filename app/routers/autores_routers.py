from app.schemas.autores_schemas import AutorCreateSchema, AutorUpdateSchema, AutorResponseSchema
from app.repositories.autores_repo import cadastrar_autor, listar_autores,  buscar_autor_por_id, atualizar_autor, deletar_autor
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import verifica_role
from fastapi import APIRouter, Depends
from typing import Any

router = APIRouter(prefix="/autores", tags=["Autores"])

# Rota para cadastrar um novo autor
@router.post("/", response_model=AutorResponseSchema)
def cadastrar_novo_autor(autor: AutorCreateSchema, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return cadastrar_autor(db, autor)

# Rota para listar todos os autores
@router.get("/", response_model=list[AutorResponseSchema])
def listar_todos_autores(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return listar_autores(db, skip=skip, limit=limit)

# Rota para buscar um autor pelo ID
@router.get("/{autor_id}", response_model=list[AutorResponseSchema])
def mostra_autor_pelo_id(autor_id: int, db: Session = Depends(get_db)):
    autor = buscar_autor_por_id(db, autor_id)
    if autor:
        return [autor]
    return []

# Rota para atualizar os dados de um autor existente
@router.put("/{autor_id}", response_model=AutorResponseSchema)
def atualizar_dados_autor(autor_id: int, autor: AutorUpdateSchema, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return atualizar_autor(db, autor_id, autor) 

# Rota para deletar um autor pelo ID
@router.delete("/{autor_id}", status_code=204)
def deletar_dados_autor(autor_id: int, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return deletar_autor(db, autor_id)
