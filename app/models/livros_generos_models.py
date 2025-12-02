from sqlalchemy import Column, Integer, ForeignKey
from app.db.base import Base

# Definição do modelo de tabela de junção LivrosGeneros
class LivrosGenerosModels(Base):
    __tablename__ = 'livros_generos'

    livro_id = Column(Integer, ForeignKey('livro.livro_id'), nullable=False, primary_key=True)
    genero_id = Column(Integer, ForeignKey('generos.genero_id'), nullable=False, primary_key=True)