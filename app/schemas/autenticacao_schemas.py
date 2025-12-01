from pydantic import BaseModel, EmailStr, Field
from app.models.usuarios_models import roleEnum

# schema para login

class LoginSchema(BaseModel):
    email: EmailStr = Field(..., max_length=100)
    senha: str = Field(..., min_length=6, max_length=255)

# response model atualizado para o front_end 
class LoginResponseFrontendSchema(BaseModel):
    token: str
    tipo_token: str = "bearer"
    role: str
    nome: str
    email: EmailStr
    id: int
    
    class Config:
        from_attributes = True

# schemas para registro de usuário
class RegisterSchema(BaseModel):
    nome: str = Field(..., min_length=1, max_length=255)
    email: EmailStr = Field(..., max_length=100)
    senha: str = Field(..., min_length=6, max_length=255)
    role: roleEnum = roleEnum.LEITOR

class ResponseRegisterSchema(BaseModel):
    usuario_id: int
    nome: str
    email: EmailStr
    role: roleEnum

    class Config:
        from_attributes = True
