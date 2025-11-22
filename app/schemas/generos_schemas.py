from pydantic import BaseModel, Field

class GeneroBase(BaseModel):
    nome: str = Field(..., min_length=1, max_length=100)

class GeneroCreate(GeneroBase):
    pass    

class GeneroResponse(GeneroBase):
    genero_id: int

    class Config:
        from_attributes = True
