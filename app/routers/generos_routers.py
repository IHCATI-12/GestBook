from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session  
from app.schemas.generos_schemas import GeneroCreate, GeneroResponse
from app.repositories.generos_repo import criar_genero, listar_generos,obter_genero_por_id, deletar_genero
from app.db.session import get_db
from app.core.security import verifica_role
from typing import Any

router = APIRouter(prefix="/generos", tags=["Gêneros"])

@router.post("/", response_model=GeneroResponse)
def criar_novo_genero(genero: GeneroCreate, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return criar_genero(db, genero)

@router.get("/", response_model=list[GeneroResponse])
def obter_generos(db: Session = Depends(get_db)):
    return listar_generos(db)

@router.get("/{genero_id}", response_model=GeneroResponse)
def obter_genero(genero_id: int, db: Session = Depends(get_db)):
    genero = obter_genero_por_id(db, genero_id)
    if not genero:
        raise HTTPException(status_code=404, detail="Gênero não encontrado")
    return genero

@router.delete("/{genero_id}", status_code=204)
def deletar_dados_genero(genero_id: int, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    deletar_genero(db, genero_id)