from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from app.models.usuarios_models import roleEnum
from datetime import datetime

# Schema base para Usuário
class UsuarioBaseSchema(BaseModel):
    nome: str = Field(..., min_length=1, max_length=255)
    email: EmailStr = Field(..., max_length=100)
    role: roleEnum = roleEnum.LEITOR

# Schema para criação de Usuário
class UsuarioCreateSchema(UsuarioBaseSchema):
    senha: str = Field(..., min_length=6, max_length=255)

# Schema para atualização de Usuário
class UsuarioUpdateSchema(BaseModel):
    nome: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    role: Optional[roleEnum] = None
    senha: Optional[str] = Field(None, min_length=6, max_length=255)

# Schema de resposta para Usuário
class UsuarioResponseSchema(UsuarioBaseSchema):
    usuario_id: int
    data_cadastro: datetime

    class Config:
        from_attributes = True