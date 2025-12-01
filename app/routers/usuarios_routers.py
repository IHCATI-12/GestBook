from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.usuarios_models import Usuario
from app.schemas.usuarios_schemas import UsuarioCreateSchema, UsuarioUpdateSchema, UsuarioResponseSchema
from app.repositories.usarios_repo import atualizar_usuario, listar_usuario_leitores, obter_usuario_por_id,listar_usuarios_bibliotecarios, deletar_usuario
from app.db.session import get_db

router = APIRouter(prefix="/usuarios", tags=["Usuários"])   

# Rota para atualizar os dados de um usuário existente
@router.put("/{usuario_id}", response_model=UsuarioResponseSchema)
def atualizar_dados_usuario(usuario_id: int, usuario: UsuarioUpdateSchema, db: Session = Depends(get_db)):
    return atualizar_usuario(db, usuario_id, usuario)

# Rota para obter um usuário pelo ID
@router.get("/{usuario_id}", response_model=UsuarioResponseSchema)
def obter_usuario(usuario_id: int, db: Session = Depends(get_db)):
    usuario = obter_usuario_por_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return usuario

# Rota para listar todos os usuários bibliotecários
@router.get("/", response_model=list[UsuarioResponseSchema])
def listar_usuarios(db: Session = Depends(get_db)):
    return listar_usuarios_bibliotecarios(db)

# Rota para listar todos os usuários leitores
@router.get("/leitores/", response_model=list[UsuarioResponseSchema])
def listar_leitores(db: Session = Depends(get_db)):
    return listar_usuario_leitores(db)

# Rota para deletar um usuário pelo ID
@router.delete("/{usuario_id}", status_code=204)
def deletar_dados_usuario(usuario_id: int, db: Session = Depends(get_db)):
    deletar_usuario(db, usuario_id)

