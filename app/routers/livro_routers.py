from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.schemas.livro_schemas import LivroCreateSchema, LivroUpdateSchema, LivroResponseSchema
from app.repositories.livros_repo import cadastrar_livro, listar_livros, atualizar_livro, listar_livros_com_estoque, obter_livro_por_id, deletar_livro, deletar_livro_e_emprestimos
from app.db.session import get_db
from app.core.security import verifica_role
from typing import Any, List, Optional

router = APIRouter(prefix="/livros", tags=["Livros"])

@router.post("/", response_model=LivroResponseSchema)
def cadastrar_novo_livro(livro: LivroCreateSchema, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return cadastrar_livro(db, livro)

@router.get("/", response_model=List[LivroResponseSchema])
def obter_livros(genero: Optional[int] = Query(None, description="ID do Gênero para filtrar os livros."), search: Optional[str] = Query(None, description="Termo de busca (título ou autor)."), db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario", "leitor"]))):
    return listar_livros(db, genero=genero, search=search)

@router.put("/{livro_id}", response_model=LivroResponseSchema)
def atualizar_dados_livro(livro_id: int, livro: LivroUpdateSchema, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return atualizar_livro(db, livro_id, livro)

@router.delete("/{livro_id}", status_code=204)
def deletar_dados_livro(livro_id: int, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return deletar_livro(db, livro_id)

# Funcionalidade para deletar livro e seus empréstimos associados
@router.delete("/{livro_id}/com-emprestimos", status_code=204)
def deletar_livro_com_emprestimos(livro_id: int, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return deletar_livro_e_emprestimos(db, livro_id)

# lista livros com estoque disponível
@router.get("/estoque/", response_model=List[LivroResponseSchema])  
def listar_livros_estoque(db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario", "leitor"]))):
    return listar_livros_com_estoque(db)

# Busca livro pelo id
@router.get("/{livro_id}", response_model=LivroResponseSchema)
def livro_por_id(livro_id: int, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario", "leitor"]))):    
    return obter_livro_por_id(db, livro_id)

