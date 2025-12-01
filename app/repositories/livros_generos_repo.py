from app.models.livros_generos_models import LivrosGenerosModels
from app.schemas.livros_generos_schemas import LivrosGenerosSchemas
from sqlalchemy.orm import Session  


# criar relação entre livro e gênero
def create_livro_genero(db: Session, livro_generos: LivrosGenerosSchemas):
    novos_resgistros = []
    for genero_id in livro_generos.generos_ids:
        novo_registro = LivrosGenerosModels(
            livro_id=livro_generos.livro_id,
            genero_id=genero_id
        )
        novos_resgistros.append(novo_registro)
    db.add_all(novos_resgistros)
    db.commit()
    for registro in novos_resgistros:
        db.refresh(registro)
    return novos_resgistros

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