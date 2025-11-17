from sqlalchemy import Column, Integer, String, Date
from app.db.base import Base

class Autor(Base): 
    __tablename__ = "autores"

    autor_id = Column(Integer, primary_key=True, index=True)
    nome = Column(String(255), index=True, nullable=False)
    sobrenome = Column(String(255), index=True)
    nacionalidade = Column(String(100), index=True)
    data_nascimento = Column(Date, index=True) 

