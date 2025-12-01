from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import senha_hash, verifica_senha
from app.core.jwt import cria_token_acesso as criar_token_acesso
from app.repositories.autenticacao_repo import registra_usuario
from app.schemas.autenticacao_schemas import RegisterSchema, ResponseRegisterSchema, LoginSchema, LoginResponseFrontendSchema
from app.models.usuarios_models import Usuario

router = APIRouter(prefix="/auth", tags=["Autenticação"])

# Rota para registrar um novo usuário
@router.post("/register", response_model=ResponseRegisterSchema)
def registra_novo_usuario(register_dados: RegisterSchema, db: Session = Depends(get_db)):
    senha_criptografada = senha_hash(register_dados.senha)
    usuario = db.query(Usuario).filter(Usuario.email == register_dados.email).first()
    if usuario:
        raise HTTPException(status_code=400, detail="E-mail já registrado")
    novo_usuario = Usuario(
        nome=register_dados.nome,
        email=register_dados.email,
        senha_hash=senha_criptografada,
        role=register_dados.role.value
    )
    novo_usuario = registra_usuario(db, register_dados.nome, register_dados.email, senha_criptografada, register_dados.role.value)
    return novo_usuario

# rota login de usuário
@router.post("/login", response_model=LoginResponseFrontendSchema)
def login_usuario(login_dados: LoginSchema, db: Session = Depends(get_db)):
    usuario = db.query(Usuario).filter(Usuario.email == login_dados.email).first()
    if not usuario:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    if not verifica_senha(login_dados.senha, usuario.senha_hash): # type: ignore
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    token = criar_token_acesso(dados={"sub": str(usuario.usuario_id)})
    id = db.query(Usuario.usuario_id).filter(Usuario.email == login_dados.email).first()
    return LoginResponseFrontendSchema(
        token=token,
        tipo_token="bearer",
        role=str(usuario.role),
        nome=str(usuario.nome),
        email=str(usuario.email),
        id=int(id[0]) # type: ignore
    )  