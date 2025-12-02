from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.base import Base
from sqlalchemy.orm import relationship

# Definição do modelo Genero
class Genero(Base):
    __tablename__ = 'generos'

    genero_id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True, index=True, nullable=False)

    #-- Relationship com Livro --
    livros = relationship("Livro", secondary="livros_generos", back_populates="generos")