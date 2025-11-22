from app.models.generos_models import Genero
from app.schemas.generos_schemas import GeneroCreate, GeneroResponse
from sqlalchemy.orm import Session
from fastapi import HTTPException   


def criar_genero(db: Session, genero: GeneroCreate) -> Genero:
    genero_existente = db.query(Genero.nome).filter_by(nome=genero.nome).first()
    if genero_existente:
        raise HTTPException(status_code=400, detail="Gênero já cadastrado")
    
    novo_genero = Genero(nome=genero.nome)
    db.add(novo_genero)
    db.commit()
    db.refresh(novo_genero)
    return novo_genero

def listar_generos(db: Session) -> list[Genero]:
    return db.query(Genero).all()

def obter_genero_por_id(db: Session, genero_id: int) -> Genero:
    return db.query(Genero).filter(Genero.genero_id == genero_id).first()

def deletar_genero(db: Session, genero_id: int) -> None:
    genero_db = db.query(Genero).filter(Genero.genero_id == genero_id).first()
    if genero_db:
        db.delete(genero_db)
        db.commit()