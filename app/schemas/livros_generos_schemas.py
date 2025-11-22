from pydantic import BaseModel  


class LivrosGenerosSchemas(BaseModel):
    livro_id: int
    genero_id: int

    class Config:
        orm_mode = True