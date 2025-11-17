from app.models.usuarios_models import Usuario
from app.schemas.usuarios_schemas import UsuarioCreateSchema, UsuarioUpdateSchema
from sqlalchemy.orm import Session
from fastapi import HTTPException
from typing import Optional
from app.core.security import senha_hash

ROLES_VALIDOS = {"leitor", "bibliotecario"}

def criar_usuario(db: Session, usuario: UsuarioCreateSchema) -> Usuario:
    role = usuario.role.value if usuario.role in ROLES_VALIDOS else "leitor"
    novo_usuario = Usuario(
        nome=usuario.nome,
        email=usuario.email,
        senha_hash=senha_hash(usuario.senha.strip()),
        role=role
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario

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

def obter_usuario_por_email(db: Session, email: str) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.email == email).first()

def obter_usuario_por_nome(db: Session, nome: str) -> Optional[Usuario]:
    return db.query(Usuario).filter(Usuario.nome == nome).first()

def deletar_usuario(db: Session, usuario_id: int) -> None:
    usuario_db = db.query(Usuario).filter(Usuario.usuario_id == usuario_id).first()
    if not usuario_db:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    
    db.delete(usuario_db)
    db.commit()

