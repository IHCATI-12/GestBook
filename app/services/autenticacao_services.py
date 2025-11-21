from app.models.usuarios_models import Usuario
from app.core.security import verifica_senha
from typing import Optional
from fastapi import HTTPException

# Resgistra um novo usuário
def verifica_dados_existentes(db, email: str) -> bool:
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    return usuario is not None

def registra_usuario(db, nome: str, email: str, senha_hash: str, role: str) -> Usuario:
    if verifica_dados_existentes(db, email):
        raise HTTPException(status_code=400, detail="E-mail já registrado")
    novo_usuario = Usuario(
        nome=nome,
        email=email,
        senha_hash=senha_hash,
        role=role
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario

# autentica um usuário existente

def autentica_usuario(db, email: str, senha: str) -> Optional[Usuario]:
    usuario = db.query(Usuario).filter(Usuario.email == email).first()
    if usuario and verifica_senha(senha, usuario.senha_hash):  # type: ignore
        return usuario
    return None

