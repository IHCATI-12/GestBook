from app.schemas.generos_schemas import GeneroCreate, GeneroResponse
from app.schemas.livro_schemas import LivroResponseSimplificado
from app.repositories.generos_repo import criar_genero, listar_generos,obter_genero_por_id, deletar_genero, buscar_livros_por_genero
from sqlalchemy.orm import Session  
from app.db.session import get_db
from app.core.security import verifica_role
from fastapi import APIRouter, Depends, HTTPException
from typing import Any

router = APIRouter(prefix="/generos", tags=["Gêneros"])

# Rota para cadastrar um novo gênero
@router.post("/", response_model=GeneroResponse)
def criar_novo_genero(genero: GeneroCreate, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return criar_genero(db, genero)

# Rota para listar todos os gêneros
@router.get("/", response_model=list[GeneroResponse])
def obter_generos(db: Session = Depends(get_db)):
    return listar_generos(db)

# Rota para obter um gênero pelo ID
@router.get("/{genero_id}", response_model=GeneroResponse)
def obter_genero(genero_id: int, db: Session = Depends(get_db)):
    genero = obter_genero_por_id(db, genero_id)
    if not genero:
        raise HTTPException(status_code=404, detail="Gênero não encontrado")
    return genero

# Rota para obter livros por gênero
@router.get("/{genero_id}/livros", response_model=list[LivroResponseSimplificado])
def obter_livros_por_genero(genero_id: int, db: Session = Depends(get_db)):
    genero = obter_genero_por_id(db, genero_id)
    if not genero:
        raise HTTPException(status_code=404, detail="Gênero não encontrado")
    return buscar_livros_por_genero(db, genero_id)

# Rota para deletar um gênero pelo ID
@router.delete("/{genero_id}", status_code=204)
def deletar_dados_genero(genero_id: int, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    deletar_genero(db, genero_id)