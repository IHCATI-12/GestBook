from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.autenticacao_schemas import TokenSchema, LoginSchema
from app.db.session import get_db
from app.models.usuarios_models import Usuario
from app.core.security import verifica_senha
from app.core.jwt import cria_token_acesso

import os

router = APIRouter(prefix="/auth", tags=["Autenticação"])

@router.post("/login", response_model=TokenSchema)
def login_autenticacao(login_dados: LoginSchema, db: Session = Depends(get_db)):
    usuario: Usuario = db.query(Usuario).filter(Usuario.email == login_dados.email).first()
    
    if not usuario or not verifica_senha(login_dados.senha, usuario.senha_hash): # type: ignore
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,detail="Credenciais inválidas",headers={"WWW-Authenticate": "Bearer"},)
    
    token_dados = {"sub": str(usuario.usuario_id)}
    token = cria_token_acesso(token_dados, os.getenv("SENHA_TOKEN", "minha_senha_secreta"))
    
    return TokenSchema(access_token=token)



