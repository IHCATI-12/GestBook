from pydantic import BaseModel, Field

# Schema base para Gênero
class GeneroBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=100)

# Schema para criação de Gênero
class GeneroCreate(GeneroBase):
    pass    

# Schema para atualização de Gênero
class GeneroResponse(GeneroBase):
    genero_id: int

    class Config:
        from_attributes = True
