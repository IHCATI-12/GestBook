from app.models.usuarios_models import Usuario
from app.schemas.usuarios_schemas import UsuarioUpdateSchema
from app.core.security import senha_hash
from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import Optional

ROLES_VALIDOS = {"leitor", "bibliotecario"}

# Função para atualizar um usuário existente 
def atualizar_usuario(db: Session, usuario_id: int, usuario_atualizado: UsuarioUpdateSchema) -> Optional[Usuario]:
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

# Função para obter um usuário por ID
def obter_usuario_por_id(db: Session, usuario_id: int) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.usuario_id == usuario_id).first()

# Função para listar todos os usuários bibliotecários 
def listar_usuarios_bibliotecarios(db: Session) -> list[Usuario]:
    return db.query(Usuario).filter(Usuario.role == "bibliotecario").all()

# Função para listar todos os usuários leitores
def listar_usuario_leitores(db: Session) -> list[Usuario]:
    return db.query(Usuario).filter(Usuario.role == "leitor").all()

# Função para deletar um usuário
def deletar_usuario(db: Session, usuario_id: int) -> None:
    usuario_db = db.query(Usuario).filter(Usuario.usuario_id == usuario_id).first()
    if not usuario_db:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    db.delete(usuario_db)
    db.commit()

