from sqlalchemy import Column, Integer, String, Date, CheckConstraint
from app.db.base import Base
from sqlalchemy.sql import expression

# Definição do modelo Autor
class Autor(Base): 
    __tablename__ = "autores"

    autor_id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), index=True, nullable=False)
    sobrenome = Column(String(255), index=True)
    nacionalidade = Column(String(100), index=True)
    data_nascimento = Column(Date, index=True) 

    # ---- CHECK Constraints ----
    # Garantir que a data de nascimento não seja futura
    __table_args__ = (
        CheckConstraint(
            data_nascimento <= expression.func.current_date(),
            name='ck_data_nascimento_nao_futura'
        ),
    )