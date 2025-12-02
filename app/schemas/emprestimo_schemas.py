from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date, datetime
from enum import Enum

# Enum para status do empréstimo
class StatusEmprestimoEnum(str, Enum):
    EMPRESTADO = "Emprestado"
    DEVOLVIDO = "Devolvido"

# Schema base para Empréstimo
class EmprestimoBaseSchema(BaseModel):
    livro_id: int
    leitor_id: int
    bibliotecario_id: int
    data_devolucao_prevista: datetime

# Schema para criação de Empréstimo
class EmprestimoCreateSchema(EmprestimoBaseSchema):
    # Validador para garantir que a data de devolução prevista seja futura
    @field_validator('data_devolucao_prevista', mode='before')
    @classmethod
    def check_future_date(cls, v):
        if isinstance(v, str):
            v = datetime.fromisoformat(v.replace('Z', '+00:00')) # Converte string ISO para datetime
            
        hoje = datetime.combine(date.today(), datetime.min.time())
        
        # Compara apenas as datas (ignorando a hora)
        if v.date() <= hoje.date():
            raise ValueError("A data de devolução prevista deve ser posterior à data de hoje.")
        
        return v

# Schema para atualização de Empréstimo
class EmprestimoUpdateSchema(BaseModel):
    livro_id: Optional[int] = None
    leitor_id: Optional[int] = None
    bibliotecario_id: Optional[int] = None
    data_devolucao_prevista: Optional[datetime] = None
    data_devolucao_real: Optional[datetime] = None
    status_emprestimo: Optional[StatusEmprestimoEnum] = None

# Schema para devolução de Empréstimo
class DevolucaoSchema(BaseModel):
    bibliotecario_devolucao_id: int
    data_devolucao_real: datetime

# Schema de resposta para Empréstimo
class EmprestimoResponseSchema(EmprestimoBaseSchema):
    emprestimo_id: int
    livro_id: int
    leitor_id: int
    bibliotecario_id: int
    data_devolucao_prevista: datetime
    data_emprestimo: datetime
    data_devolucao_real: Optional[datetime] = None
    status_emprestimo: StatusEmprestimoEnum
    is_atrasado: bool

    class Config:
        from_attributes = True
        use_enum_values = True
  