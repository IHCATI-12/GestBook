from pydantic import BaseModel, Field
from datetime import date
from typing import Optional

class AutorBaseSchema(BaseModel):
    nome: str = Field(..., max_length=255)
    data_nascimento: date

class AutorCreateSchema(AutorBaseSchema):
    sobrenome: str = Field(..., max_length=255)
    nacionalidade: str = Field(..., max_length=100)

# Permitir campos opcionais para atualização, filha de BaseModel
class AutorUpdateSchema(BaseModel):
    nome: Optional[str] = Field(None, max_length=255)
    data_nascimento: Optional[date] = None
    sobrenome: Optional[str] = Field(None, max_length=255)
    nacionalidade: Optional[str] = Field(None, max_length=100)

class AutorResponseSchema(AutorBaseSchema):
    autor_id: int
    sobrenome: str = Field(..., max_length=255)
    nacionalidade: str = Field(..., max_length=100)

    class Config:
        from_attributes = True