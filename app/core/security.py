from passlib.context import CryptContext 
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.models.usuarios_models import Usuario
from app.db.session import get_db
from typing import cast
import os

seguranca = HTTPBearer()

contexto_senha = CryptContext(schemes=["argon2"], deprecated="auto")

def senha_hash(password: str) -> str:
    return contexto_senha.hash(password)

def verifica_senha(senha: str, senha_criptografada: str) -> bool:
    return contexto_senha.verify(senha, senha_criptografada)   
 
def verifica_role(roles_permitidas: list[str]):
    def role_checker(usuario: Usuario = Depends(obter_usuario_atual)) -> Usuario:
        if usuario.role not in roles_permitidas:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso negado")
        return usuario
    return role_checker

def obter_usuario_atual(db: Session = Depends(get_db), credentials: HTTPAuthorizationCredentials = Depends(seguranca)) -> Usuario:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, os.getenv("SENHA_TOKEN", "minha_senha_secreta") , algorithms=["HS256"])
        usuario_id = cast(str, payload.get("sub"))
        if usuario_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")    
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")
    
    usuario = db.query(Usuario).filter(Usuario.usuario_id == int(usuario_id)).first()
    if usuario is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
    
    return usuario



