from pydantic import BaseModel, Field, field_validator
from datetime import date
from typing import Optional

class AutorBaseSchema(BaseModel):
    nome: str = Field(..., max_length=255)
    data_nascimento: Optional[date] = None
    @field_validator('data_nascimento')
    @classmethod
    def check_data_nao_futura(cls, valor_data: date) -> date:
        data_hoje = date.today()
        if valor_data > data_hoje:
            raise ValueError(
                f"A data de nascimento não pode ser maior que a data atual ({data_hoje.isoformat()})."
            )
        return valor_data

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