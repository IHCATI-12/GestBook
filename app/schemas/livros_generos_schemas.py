from pydantic import BaseModel  

# Schema para associação entre Livros e Gêneros
class LivrosGenerosSchemas(BaseModel):
    livro_id: int
    generos_ids: list[int]

    class Config:
        from_attributes = True