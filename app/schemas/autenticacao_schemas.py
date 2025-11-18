from pydantic import BaseModel, EmailStr

class LoginSchema(BaseModel):
    email: EmailStr
    senha: str

# inativo
class TokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"

# response model atualizado para o front_end 
class LoginResponseFrontendSchema(TokenSchema):
    user_role: str
    user_name: str
