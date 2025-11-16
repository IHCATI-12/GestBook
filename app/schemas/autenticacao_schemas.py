from pydantic import BaseModel, EmailStr

class LoginSchema(BaseModel):
    email: EmailStr
    senha: str

class TokenSchema(BaseModel):
    access_token: str
    token_type: str = "bearer"
