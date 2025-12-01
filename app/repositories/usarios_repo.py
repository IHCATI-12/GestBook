from app.models.usuarios_models import Usuario
from app.schemas.usuarios_schemas import UsuarioCreateSchema, UsuarioUpdateSchema
from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import Optional
from app.core.security import senha_hash

ROLES_VALIDOS = {"leitor", "bibliotecario"}


def atualizar_usuario(db: Session, usuario_id: int, usuario_atualizado: UsuarioUpdateSchema) -> Optional[Usuario]:
    # mover para services futuramente
    usuario_db = db.query(Usuario).filter(Usuario.usuario_id == usuario_id).first()
    if not usuario_db:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    if usuario_atualizado.nome is not None:
        usuario_db.nome = usuario_atualizado.nome # type: ignore
    if usuario_atualizado.email is not None:
        usuario_db.email = usuario_atualizado.email # type: ignore
    if usuario_atualizado.senha is not None:
        usuario_db.senha_hash = senha_hash(usuario_atualizado.senha) # type: ignore
    if usuario_atualizado.role is not None:
        usuario_db.role = usuario_atualizado.role # type: ignore

    db.commit()
    db.refresh(usuario_db)
    return usuario_db

def obter_usuario_por_id(db: Session, usuario_id: int) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.usuario_id == usuario_id).first()

def listar_usuarios_bibliotecarios(db: Session) -> list[Usuario]:
    return db.query(Usuario).filter(Usuario.role == "bibliotecario").all()

def listar_usuario_leitores(db: Session) -> list[Usuario]:
    return db.query(Usuario).filter(Usuario.role == "leitor").all()

def deletar_usuario(db: Session, usuario_id: int) -> None:
    usuario_db = db.query(Usuario).filter(Usuario.usuario_id == usuario_id).first()
    if not usuario_db:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    db.delete(usuario_db)
    db.commit()

