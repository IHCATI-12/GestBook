from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.models.usuarios_models import Usuario
from app.schemas.usuarios_schemas import UsuarioCreateSchema, UsuarioUpdateSchema, UsuarioResponseSchema
from app.repositories.usarios_repo import criar_usuario, atualizar_usuario, obter_usuario_por_id, deletar_usuario
from app.db.session import get_db

router = APIRouter(prefix="/usuarios", tags=["Usuários"])   

@router.post("/", response_model=UsuarioResponseSchema)
def criar_novo_usuario(usuario: UsuarioCreateSchema, db: Session = Depends(get_db)):
    usuario_verifcar_email: Usuario = db.query(Usuario).filter(Usuario.email == usuario.email).first()
    if usuario_verifcar_email:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    return criar_usuario(db, usuario)

@router.put("/{usuario_id}", response_model=UsuarioResponseSchema)
def atualizar_dados_usuario(usuario_id: int, usuario: UsuarioUpdateSchema, db: Session = Depends(get_db)):
    return atualizar_usuario(db, usuario_id, usuario)

@router.get("/{usuario_id}", response_model=UsuarioResponseSchema)
def obter_usuario(usuario_id: int, db: Session = Depends(get_db)):
    usuario = obter_usuario_por_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return usuario

@router.delete("/{usuario_id}", status_code=204)
def deletar_dados_usuario(usuario_id: int, db: Session = Depends(get_db)):
    deletar_usuario(db, usuario_id)

