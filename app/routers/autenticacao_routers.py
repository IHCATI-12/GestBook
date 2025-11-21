from sqlalchemy.orm import Session
from fastapi import APIRouter, Depends, HTTPException, status
from app.db.session import get_db
from app.schemas.autenticacao_schemas import RegisterSchema, ResponseRegisterSchema, LoginSchema, LoginResponseFrontendSchema
from app.core.security import senha_hash, verifica_senha, verifica_role
from app.core.jwt import cria_token_acesso as criar_token_acesso
from app.services.autenticacao_services import registra_usuario, autentica_usuario

router = APIRouter(prefix="/auth", tags=["Autenticação"])

# rota de registro de novo usuário

@router.post("/register", response_model=ResponseRegisterSchema)
def registra_novo_usuario(register_dados: RegisterSchema, db: Session = Depends(get_db)):
    senha_criptografada = senha_hash(register_dados.senha)
    novo_usuario = registra_usuario(
        db,
        nome=register_dados.nome,
        email=register_dados.email,
        senha_hash=senha_criptografada,
        role=register_dados.role.value
    )
    return novo_usuario

# rota login de usuário
@router.post("/login", response_model=LoginResponseFrontendSchema)
def login_usuario(login_dados: LoginSchema, db: Session = Depends(get_db)):
    usuario = autentica_usuario(db, email=login_dados.email, senha=login_dados.senha)
    if not usuario:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    token = criar_token_acesso(dados={"sub": str(usuario.usuario_id)})  
    return LoginResponseFrontendSchema(
        token=token,
        tipo_token="bearer",
        role=str(usuario.role),
        nome=str(usuario.nome),
        email=str(usuario.email)
    )   