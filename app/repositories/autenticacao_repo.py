from app.models.usuarios_models import Usuario
from sqlalchemy.orm import Session

# Função para registrar um novo usuário
def registra_usuario(db: Session, nome: str, email: str, senha_hash: str, role: str) -> Usuario:
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
