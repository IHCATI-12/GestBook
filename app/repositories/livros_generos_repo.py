from app.models.livros_generos_models import LivrosGenerosModels
from app.schemas.livros_generos_schemas import LivrosGenerosSchemas
from sqlalchemy.orm import Session  


# criar relação entre livro e gênero
def create_livro_genero(db: Session, livro_genero: LivrosGenerosSchemas):
    db_livro_genero = LivrosGenerosModels(
        livro_id=livro_genero.livro_id,
        genero_id=livro_genero.genero_id
    )
    db.add(db_livro_genero)
    db.commit()
    db.refresh(db_livro_genero)
    return db_livro_genero


# obter todas as relações entre livros e gêneros
def get_livros_generos(db: Session, skip: int = 0, limit: int = 100):
    return db.query(LivrosGenerosModels).offset(skip).limit(limit).all()

# obter relação específica entre livro e gênero
def get_livro_genero(db: Session, livro_id: int, genero_id: int):
    return db.query(LivrosGenerosModels).filter(
        LivrosGenerosModels.livro_id == livro_id,
        LivrosGenerosModels.genero_id == genero_id
    ).first()

# deletar relação entre livro e gênero
def delete_livro_genero(db: Session, livro_id: int, genero_id: int):
    db_livro_genero = get_livro_genero(db, livro_id, genero_id)
    if db_livro_genero:
        db.delete(db_livro_genero)
        db.commit()
    return db_livro_genero