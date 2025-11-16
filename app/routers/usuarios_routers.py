from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.usuarios_schemas import UsuarioCreateSchema, UsuarioUpdateSchema, UsuarioResponseSchema
from app.repositories.usarios_repo import criar_usuario, atualizar_usuario, obter_usuario_por_id, obter_usuario_por_email, obter_usuario_por_nome,deletar_usuario
from app.db.session import get_db

router = APIRouter(prefix="/usuarios", tags=["Usuários"])   

@router.post("/", response_model=UsuarioResponseSchema)
def criar_novo_usuario(usuario: UsuarioCreateSchema, db: Session = Depends(get_db)):
    print("Senha recebida:", usuario.senha) # log para depuração
    return criar_usuario(db, usuario)

@router.put("/{usuario_id}", response_model=UsuarioResponseSchema)
def atualizar_dados_usuario(usuario_id: int, usuario: UsuarioUpdateSchema, db: Session = Depends(get_db)):
    return atualizar_usuario(db, usuario_id, usuario)

@router.get("/{usuario_id}", response_model=UsuarioResponseSchema)
def obter_usuario(usuario_id: int, db: Session = Depends(get_db)):
    usuario = obter_usuario_por_id(db, usuario_id)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return usuario

@router.delete("/{usuario_id}", status_code=204)
def deletar_dados_usuario(usuario_id: int, db: Session = Depends(get_db)):
    deletar_usuario(db, usuario_id)

@router.get("/email/{email}", response_model=UsuarioResponseSchema) 
def obter_usuario_por_email_rota(email: str, db: Session = Depends(get_db)):
    usuario = obter_usuario_por_email(db, email)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return usuario

@router.get("/nome/{nome}", response_model=UsuarioResponseSchema)
def obter_usuario_por_nome_rota(nome: str, db: Session = Depends(get_db)):
    usuario = obter_usuario_por_nome(db, nome)
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return usuario
