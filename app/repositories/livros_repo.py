from sqlalchemy import or_
from app.models.livro_models import Livro
from app.models.autores_models import Autor
from app.models.livros_generos_models import LivrosGenerosModels
from app.schemas.livro_schemas import LivroCreateSchema, LivroUpdateSchema
from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import Optional
from app.repositories.livros_generos_repo import create_livro_genero
from app.schemas.livros_generos_schemas import LivrosGenerosSchemas 
from app.models.emprestimo_models import Emprestimo, status_emprestimoEnum
from app.repositories.emprestimo_repo import deletar_emprestimo


def cadastrar_livro(db: Session, livro: LivroCreateSchema) -> Livro:
    # mover para services futuramente
    autor_cadastrado = db.query(Autor).filter(Autor.autor_id == livro.autor_id).first()
    if not autor_cadastrado:
        raise HTTPException(status_code=400, detail="Autor não cadastrado")
    novo_livro = Livro(
        titulo=livro.titulo,
        isbn=livro.isbn,
        editora=livro.editora,
        ano_publicacao=livro.ano_publicacao,
        numero_copias=livro.numero_copias,
        autor_id=livro.autor_id,
    )
    db.add(novo_livro)
    db.commit()
    db.refresh(novo_livro)
    lista_generos_ids = livro.lista_generos_ids
    create_livro_genero(db, LivrosGenerosSchemas(livro_id=novo_livro.livro_id, generos_ids=lista_generos_ids))  # type: ignore
    return novo_livro

def listar_livros(db: Session, genero: Optional[int] = None, search: Optional[str] = None, skip: int = 0, limit: int = 100) -> list[Livro]:
    query = db.query(Livro)
    if genero is not None:
        query = query.join(LivrosGenerosModels).filter(
            LivrosGenerosModels.genero_id == genero
        ).distinct()
    if search:
        search_pattern = f"%{search}%"
        query = query.join(Autor) 
        query = query.filter(
            or_(Livro.titulo.ilike(search_pattern),Autor.nome.ilike(search_pattern), Autor.sobrenome.ilike(search_pattern)))
    return query.offset(skip).limit(limit).all()

def atualizar_livro(db: Session, livro_id: int, livro_atualizado: LivroUpdateSchema) -> Optional[Livro]:
    # mover para services futuramente
    livro_db = db.query(Livro).filter(Livro.livro_id == livro_id).first()
    if not livro_db:
        raise HTTPException(status_code=404, detail="Livro não encontrado")

    if livro_atualizado.titulo is not None:
        livro_db.titulo = livro_atualizado.titulo  # type: ignore
    if livro_atualizado.isbn is not None:
        livro_db.isbn = livro_atualizado.isbn  # type: ignore
    if livro_atualizado.editora is not None:
        livro_db.editora = livro_atualizado.editora  # type: ignore
    if livro_atualizado.ano_publicacao is not None:
        livro_db.ano_publicacao = livro_atualizado.ano_publicacao  # type: ignore
    if livro_atualizado.numero_copias is not None:
        livro_db.numero_copias = livro_atualizado.numero_copias  # type: ignore
    if livro_atualizado.autor_id is not None:
        livro_db.autor_id = livro_atualizado.autor_id  # type: ignore

    db.commit()
    db.refresh(livro_db)
    return livro_db

def deletar_livro(db: Session, livro_id: int) -> None:
    livro_db = db.query(Livro).filter(Livro.livro_id == livro_id).first()
    if not livro_db:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    db.delete(livro_db)
    db.commit()

# Funcao que deleta o livro e todos os emprestimos relacionados a ele se eles estiverem devolvidos
def deletar_livro_e_emprestimos(db: Session, livro_id: int) -> None:
    livro_db = db.query(Livro).filter(Livro.livro_id == livro_id).first()
    if not livro_db:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    
    emprestimos_livro = db.query(Emprestimo).filter(Emprestimo.livro_id == livro_id).all()
    for emprestimo in emprestimos_livro:
        if emprestimo.status_emprestimo != status_emprestimoEnum.DEVOLVIDO.value: # type: ignore
            raise HTTPException(status_code=409, detail="Não é possível deletar o livro pois existem empréstimos ativos relacionados a ele")
    for emprestimo in emprestimos_livro:
        deletar_emprestimo(db, emprestimo.emprestimo_id) # type: ignore
    db.delete(livro_db)
    db.commit()

# Retorna livros com etoque disponível
def listar_livros_com_estoque(db: Session) -> list[Livro]:
    livros_com_estoque = db.query(Livro).filter(Livro.numero_copias > 0).all()
    return livros_com_estoque

# verifica e atualiza o estoque do livro ao criar um empréstimo
def atualizar_estoque_livro(db: Session, livro_id: int) -> Livro:
    livro_db = db.query(Livro).filter(Livro.livro_id == livro_id).first()
    if not livro_db:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    copias_disponiveis= verificar_estoque_livro(db, livro_id) # type: ignore
    if copias_disponiveis > 0:
        livro_db.numero_copias = copias_disponiveis - 1 # type: ignore
    else:
        raise HTTPException(status_code=400, detail="Estoque esgotado para este livro")
    db.commit()
    db.refresh(livro_db)
    return livro_db

# Verifica o estoque disponível de um livro
def verificar_estoque_livro(db: Session, livro_id: int) -> bool:
    livro_db = db.query(Livro).filter(Livro.livro_id == livro_id).first()
    if not livro_db:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    copias_disponiveis: int = livro_db.numero_copias # type: ignore
    return copias_disponiveis > 0

# Busca livro pelo id
def obter_livro_por_id(db: Session, livro_id: int) -> Livro:    
    livro_db = db.query(Livro).filter(Livro.livro_id == livro_id).first()
    if not livro_db:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    return livro_db