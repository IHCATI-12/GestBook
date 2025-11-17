from pydantic import BaseModel, Field
from datetime import date
from typing import Optional

class AutorBaseSchema(BaseModel):
    nome: str = Field(..., max_length=255)
    data_nascimento: Optional[date] = None

class AutorCreateSchema(AutorBaseSchema):
    sobrenome: Optional[str] = Field(max_length=100)
    nacionalidade: Optional[str] = Field(max_length=100)

class AutorUpdateSchema(BaseModel):
    nome: Optional[str] = Field(None,max_length=255)
    data_nascimento: Optional[date] = None
    sobrenome: Optional[str] = Field(None, max_length=255)
    nacionalidade: Optional[str] = Field(None, max_length=100)

class AutorResponseSchema(AutorBaseSchema):
    autor_id: int
    sobrenome: str = Field(max_length=255)
    nacionalidade: str = Field(max_length=100)

    class Config:
        from_attributes = True