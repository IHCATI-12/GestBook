from pydantic import BaseModel, Field, EmailStr
from typing import Optional
from datetime import datetime
from enum import Enum

class RoleEnum(str, Enum):
    LEITOR = "leitor"
    BIBLIOTECARIO = "bibliotecario"

class UsuarioBaseSchema(BaseModel):
    nome: str = Field(..., max_length=255)
    email: EmailStr = Field(..., max_length=100)
    role: RoleEnum = RoleEnum.LEITOR

class UsuarioCreateSchema(UsuarioBaseSchema):
    senha: str = Field(..., min_length=6, max_length=255)

class UsuarioUpdateSchema(BaseModel):
    nome: Optional[str] = Field(None, max_length=255)
    email: Optional[EmailStr] = None
    role: Optional[RoleEnum] = None
    senha: Optional[str] = Field(None, min_length=6, max_length=255)

class UsuarioResponseSchema(UsuarioBaseSchema):
    usuario_id: int
    data_cadastro: datetime

    class Config:
        from_attributes = True