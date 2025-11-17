from app.models.livro_models import Livro
from app.schemas.livro_schemas import LivroCreateSchema, LivroUpdateSchema
from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import Optional


def cadastrar_livro(db: Session, livro: LivroCreateSchema) -> Livro:
    # mover para services futuramente
    autor_cadastrado = db.query(Livro).filter(Livro.autor_id == livro.autor_id).first()
    if not autor_cadastrado:
        raise HTTPException(status_code=400, detail="Autor não cadastrado")

    novo_livro = Livro(
        titulo=livro.titulo,
        isbn=livro.isbn,
        editora=livro.editora,
        ano_publicacao=livro.ano_publicacao,
        numero_copias=livro.numero_copias,
        autor_id=livro.autor_id
    )
    db.add(novo_livro)
    db.commit()
    db.refresh(novo_livro)
    return novo_livro

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

def obter_livro_por_id(db: Session, livro_id: int) -> Optional[Livro]:
    return db.query(Livro).filter(Livro.livro_id == livro_id).first()

def obter_livro_por_autor(db: Session, autor_id: int) -> list[Livro]:
    return db.query(Livro).filter(Livro.autor_id == autor_id).all()

def obter_livro_por_titulo(db: Session, titulo: str) -> Optional[Livro]:
    return db.query(Livro).filter(Livro.titulo == titulo).first()

def deletar_livro(db: Session, livro_id: int) -> None:
    livro_db = db.query(Livro).filter(Livro.livro_id == livro_id).first()
    if not livro_db:
        raise HTTPException(status_code=404, detail="Livro não encontrado")
    
    db.delete(livro_db)
    db.commit()

def listar_livros(db: Session, skip: int = 0, limit: int = 100) -> list[Livro]:
    return db.query(Livro).offset(skip).limit(limit).all()



