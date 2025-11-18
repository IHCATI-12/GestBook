from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.autores_schemas import AutorCreateSchema, AutorUpdateSchema, AutorResponseSchema
from app.repositories.autores_repo import cadastrar_autor, listar_autores, atualizar_autor, deletar_autor
from app.db.session import get_db
from app.core.security import verifica_role
from typing import Any

router = APIRouter(prefix="/autores", tags=["Autores"])

@router.post("/", response_model=AutorResponseSchema)
def cadastrar_novo_autor(autor: AutorCreateSchema, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return cadastrar_autor(db, autor)

@router.get("/", response_model=list[AutorResponseSchema])
def listar_todos_autores(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return listar_autores(db, skip=skip, limit=limit)

@router.put("/{autor_id}", response_model=AutorResponseSchema)
def atualizar_dados_autor(autor_id: int, autor: AutorUpdateSchema, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return atualizar_autor(db, autor_id, autor) 

@router.delete("/{autor_id}", status_code=204)
def deletar_dados_autor(autor_id: int, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return deletar_autor(db, autor_id)



