from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.autores_schemas import AutorCreateSchema, AutorUpdateSchema
from app.repositories.autores_repo import cadastrar_autor, atualizar_autor, obter_autor_por_id, obter_autor_por_nome , deletar_autor, listar_autores
from app.db.session import get_db
from app.core.security import verifica_role
from typing import Any

router = APIRouter(prefix="/autores", tags=["Autores"])

@router.post("/", response_model=AutorCreateSchema)
def cadastrar_novo_autor(autor: AutorCreateSchema, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return cadastrar_autor(db, autor)

@router.put("/{autor_id}", response_model=AutorCreateSchema)
def atualizar_dados_autor(autor_id: int, autor: AutorUpdateSchema, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return atualizar_autor(db, autor_id, autor) 

@router.get("/{autor_id}", response_model=AutorCreateSchema)
def obter_autor(autor_id: int, db: Session = Depends(get_db)):  
    autor = obter_autor_por_id(db, autor_id)
    if not autor:
        raise HTTPException(status_code=404, detail="Autor não encontrado")
    return autor

@router.get("/nome/{nome}", response_model=AutorCreateSchema)
def obter_autor_nome(nome: str, db: Session = Depends(get_db)):  
    autor = obter_autor_por_nome(db, nome)
    if not autor:
        raise HTTPException(status_code=404, detail="Autor não encontrado")
    return autor

@router.delete("/{autor_id}", status_code=204)
def deletar_dados_autor(autor_id: int, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    deletar_autor(db, autor_id)

@router.get("/", response_model=list[AutorCreateSchema])
def listar_todos_autores(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return listar_autores(db, skip=skip, limit=limit)



