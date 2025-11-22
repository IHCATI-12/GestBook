from sqlalchemy import Column, Integer, String, ForeignKey
from  app.db.base import Base

class Genero(Base):
    __tablename__ = 'generos'

    genero_id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True, index=True, nullable=False)