from sqlalchemy import Column, Integer, String, ForeignKey, CheckConstraint
from app.db.base import Base
from sqlalchemy.orm import relationship

class Livro(Base):
    __tablename__ = "livro"

    livro_id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String(255), nullable=False)
    isbn = Column(String(13), unique=True, nullable=False)
    editora = Column(String(100), nullable=True)
    ano_publicacao = Column(Integer, nullable=True)
    numero_copias = Column(Integer, nullable=False, default=1)
    autor_id = Column(Integer, ForeignKey("autores.autor_id", ondelete="RESTRICT"), nullable=False)

    generos = relationship(
        "Genero",                   # Nome da classe do modelo Genero (você usou "Genero")
        secondary="livros_generos", # Nome da sua tabela de junção (correto)
        back_populates="livros"     # Nome da propriedade no modelo Genero
    )

    # ---- CHECK Constraints ----
    __table_args__ = (
        CheckConstraint("ano_publicacao <= EXTRACT(YEAR FROM CURRENT_DATE)", name="check_ano_publicacao"),
        CheckConstraint("numero_copias >= 0", name="check_numero_copias"),
    )


    
