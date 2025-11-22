from sqlalchemy import Column, Integer, String, ForeignKey
from app.db.base import Base

class LivrosGenerosModels(Base):
    __tablename__ = 'livros_generos'

    livro_id = Column(Integer, ForeignKey('livro.livro_id'), nullable=False)
    genero_id = Column(Integer, ForeignKey('generos.genero_id'), nullable=False)