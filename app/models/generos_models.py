from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.base import Base
from sqlalchemy.orm import relationship

class Genero(Base):
    __tablename__ = 'generos'

    genero_id = Column(Integer, primary_key=True, index=True)
    nome = Column(String, unique=True, index=True, nullable=False)

    livros = relationship(
        "Livro",                    # Nome da classe do modelo Livro
        secondary="livros_generos", # Nome da sua tabela de junção (correto)
        back_populates="generos"    # Nome da propriedade no modelo Livro
    )