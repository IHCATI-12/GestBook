from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from enum import Enum

class StatusEmprestimoEnum(str, Enum):
    EMPRESTADO = "Emprestado"
    DEVOLVIDO = "Devolvido"
    ATRASADO = "Atrasado"

class EmprestimoBaseSchema(BaseModel):
    livro_id: int
    leitor_id: int
    bibliotecario_id: int
    data_devolucao_prevista: datetime

class EmprestimoCreateSchema(EmprestimoBaseSchema):
    pass

class EmprestimoUpdateSchema(BaseModel):
    livro_id: Optional[int] = None
    leitor_id: Optional[int] = None
    bibliotecario_id: Optional[int] = None
    data_devolucao_prevista: Optional[datetime] = None
    data_devolucao_real: Optional[datetime] = None
    status_emprestimo: Optional[StatusEmprestimoEnum] = None

class EmprestimoResponseSchema(EmprestimoBaseSchema):
    emprestimo_id: int
    livro_id: int
    leitor_id: int
    bibliotecario_id: int
    data_devolucao_prevista: datetime
    data_emprestimo: datetime
    data_devolucao_real: Optional[datetime] = None
    status_emprestimo: StatusEmprestimoEnum

    class Config:
        from_attributes = True
        use_enum_values = True

        