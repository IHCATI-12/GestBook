from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.livro_schemas import LivroCreateSchema, LivroUpdateSchema, LivroResponseSchema
from app.repositories.livros_repo import cadastrar_livro, atualizar_livro, obter_livro_por_autor, obter_livro_por_id, deletar_livro, listar_livros
from app.db.session import get_db
from app.core.security import verifica_role
from typing import Any

router = APIRouter(prefix="/livros", tags=["Livros"])

@router.post("/", response_model=LivroResponseSchema)
def cadastrar_novo_livro(livro: LivroCreateSchema, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return cadastrar_livro(db, livro)

@router.put("/{livro_id}", response_model=LivroResponseSchema)
def atualizar_dados_livro(livro_id: int, livro: LivroUpdateSchema, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return atualizar_livro(db, livro_id, livro)

@router.get("/{livro_id}", response_model=LivroResponseSchema)
def obter_livro(livro_id: int, db: Session = Depends(get_db)):
    livro = obter_livro_por_id(db, livro_id)
    if not livro:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    return livro

@router.get("/autor/{autor_id}", response_model=list[LivroResponseSchema])
def obter_livros_por_autor(autor_id: int, db: Session = Depends(get_db)):
    livros = obter_livro_por_autor(db, autor_id)
    return livros

@router.delete("/{livro_id}", status_code=204)
def deletar_dados_livro(livro_id: int, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    deletar_livro(db, livro_id)
    
@router.get("/", response_model=list[LivroResponseSchema])
def listar_todos_livros(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return listar_livros(db, skip=skip, limit=limit)

