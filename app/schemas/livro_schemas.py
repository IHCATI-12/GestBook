from pydantic import BaseModel, Field
from typing import Optional

# Schema base para Livro
class LivroBaseSchema(BaseModel):
    titulo: str = Field(..., max_length=255)
    isbn: str = Field(..., max_length=13)
    editora: Optional[str] = Field(None, max_length=100)
    ano_publicacao: Optional[int] = None
    numero_copias: int = Field(..., ge=0)
    autor_id: int

# Schema para criação de Livro
class LivroCreateSchema(LivroBaseSchema):
    lista_generos_ids: list[int] = Field(...)
    
# Schema para atualização de Livro
class LivroUpdateSchema(BaseModel):
    titulo: Optional[str] = Field(None, max_length=255)
    isbn: Optional[str] = Field(None, max_length=13)
    editora: Optional[str] = Field(None, max_length=100)
    ano_publicacao: Optional[int] = None
    numero_copias: Optional[int] = Field(None, ge=0)
    autor_id: Optional[int] = None

# Schema de resposta para Livro
class LivroResponseSchema(LivroBaseSchema):
    livro_id: int

    class Config:
        from_attributes = True

# Schema de resposta simplificado para Livro
class LivroResponseSimplificado(BaseModel):
    livro_id: int
    titulo: str
    isbn: str
    editora: str
    ano_publicacao: Optional[int]
    numero_copias: int
    autor_id: int

    class Config:
        from_attributes = True


