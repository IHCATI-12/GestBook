from passlib.context import CryptContext 

contexto_senha = CryptContext(schemes=["argon2"], deprecated="auto")

def senha_hash(password: str) -> str:
    return contexto_senha.hash(password)

def verifica_senha(plain_password: str, hashed_password: str) -> bool:
    return contexto_senha.verify(plain_password, hashed_password)    