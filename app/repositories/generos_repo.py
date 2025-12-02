from app.models.generos_models import Genero
from app.models.livro_models import Livro
from app.schemas.generos_schemas import GeneroCreate, GeneroResponse
from sqlalchemy.orm import Session
from fastapi import HTTPException   

# Funções para manipulação de gêneros
def criar_genero(db: Session, genero: GeneroCreate) -> Genero:
    genero_existente = db.query(Genero.nome).filter_by(nome=genero.nome).first()
    if genero_existente:
        raise HTTPException(status_code=400, detail="Gênero já cadastrado")
    novo_genero = Genero(nome=genero.nome)
    db.add(novo_genero)
    db.commit()
    db.refresh(novo_genero)
    return novo_genero

# Função para listar todos os gêneros
def listar_generos(db: Session) -> list[Genero]:
    return db.query(Genero).all()

# Função para obter um gênero por ID
def obter_genero_por_id(db: Session, genero_id: int) -> Genero:
    return db.query(Genero).filter(Genero.genero_id == genero_id).first()

# Função para buscar livros por gênero
def buscar_livros_por_genero(db: Session, genero_id: int) -> list[Livro]:
    genero_id = db.query(Genero).filter(Genero.genero_id == genero_id).first()
    if not genero_id:
        raise HTTPException(status_code=404, detail="Gênero não encontrado")    
    return genero_id.livros

# Função para deletar um gênero
def deletar_genero(db: Session, genero_id: int) -> None:
    genero_db = db.query(Genero).filter(Genero.genero_id == genero_id).first()
    if genero_db:
        db.delete(genero_db)
        db.commit()