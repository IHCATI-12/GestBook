from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.schemas.livro_schemas import LivroCreateSchema, LivroUpdateSchema, LivroResponseSchema
from app.repositories.livros_repo import cadastrar_livro, listar_livros, atualizar_livro,  deletar_livro
from app.db.session import get_db
from app.core.security import verifica_role
from typing import Any, List

router = APIRouter(prefix="/livros", tags=["Livros"])

@router.post("/", response_model=LivroResponseSchema)
def cadastrar_novo_livro(livro: LivroCreateSchema, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return cadastrar_livro(db, livro)

@router.get("/", response_model=List[LivroResponseSchema])
def obter_livros(db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario", "leitor"]))):
    return listar_livros(db)

@router.put("/{livro_id}", response_model=LivroResponseSchema)
def atualizar_dados_livro(livro_id: int, livro: LivroUpdateSchema, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return atualizar_livro(db, livro_id, livro)

@router.delete("/{livro_id}", status_code=204)
def deletar_dados_livro(livro_id: int, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return deletar_livro(db, livro_id)
    
