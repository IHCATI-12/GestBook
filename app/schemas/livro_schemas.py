from pydantic import BaseModel, Field
from typing import Optional

class LivroBaseSchema(BaseModel):
    titulo: str = Field(..., max_length=255)
    isbn: str = Field(..., max_length=13)
    editora: Optional[str] = Field(None, max_length=100)
    ano_publicacao: Optional[int] = None
    numero_copias: int = Field(..., ge=0)
    autor_id: int

class LivroCreateSchema(LivroBaseSchema):
    pass

class LivroUpdateSchema(BaseModel):
    titulo: Optional[str] = Field(None, max_length=255)
    isbn: Optional[str] = Field(None, max_length=13)
    editora: Optional[str] = Field(None, max_length=100)
    ano_publicacao: Optional[int] = None
    numero_copias: Optional[int] = Field(None, ge=0)
    autor_id: Optional[int] = None

class LivroResponseSchema(LivroBaseSchema):
    livro_id: int

    class Config:
        from_attributes = True

