from app.models.autores_models import Autor
from app.models.livro_models import Livro
from app.schemas.autores_schemas import AutorCreateSchema, AutorUpdateSchema
from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import Optional

# Função para cadastrar um novo autor
def cadastrar_autor(db: Session, autor: AutorCreateSchema) -> Autor:
    novo_autor = Autor(
        nome=autor.nome,
        sobrenome=autor.sobrenome,
        nacionalidade=autor.nacionalidade,
        data_nascimento=autor.data_nascimento
    )
    db.add(novo_autor)
    db.commit()
    db.refresh(novo_autor)
    return novo_autor

# Função para listar todos os autores
def listar_autores(db: Session, skip: int = 0, limit: int = 100) -> list[Autor]:
    return db.query(Autor).offset(skip).limit(limit).all()

# Função para atualizar um autor existente
def atualizar_autor(db: Session, autor_id: int, autor_atualizado: AutorUpdateSchema) -> Optional[Autor]:
    autor_db = db.query(Autor).filter(Autor.autor_id == autor_id).first()
    if not autor_db:
        raise HTTPException(status_code=404, detail="Autor não encontrado")

    if autor_atualizado.nome is not None:
        autor_db.nome = autor_atualizado.nome  # type: ignore
    if autor_atualizado.nacionalidade is not None:
        autor_db.nacionalidade = autor_atualizado.nacionalidade  # type: ignore
    if autor_atualizado.data_nascimento is not None:
        autor_db.data_nascimento = autor_atualizado.data_nascimento  # type: ignore
    db.commit()
    db.refresh(autor_db)
    return autor_db

# Função para buscar um autor por ID
def buscar_autor_por_id(db: Session, autor_id: int) -> Optional[Autor]:
    return db.query(Autor).filter(Autor.autor_id == autor_id).first()

# Função para deletar um autor
def deletar_autor(db: Session, autor_id: int) -> None:
    autor_db = db.query(Autor).filter(Autor.autor_id == autor_id).first()
    if not autor_db:
        raise HTTPException(status_code=404, detail="Autor não encontrado")
    livros_associados = db.query(Livro).filter(Livro.autor_id == autor_id).first()
    if livros_associados:
        raise HTTPException(status_code=400, detail=f"Não é possível deletar o autor {autor_db.nome} pois existem livros associados a ele")
    db.delete(autor_db)
    db.commit()



