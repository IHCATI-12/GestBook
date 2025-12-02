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

    #-- Relationship com Genero --
    generos = relationship("Genero", secondary="livros_generos", back_populates="livros")

    # ---- CHECK Constraints ----
    __table_args__ = (
        # Garantir que o ano de publicação não seja no futuro
        CheckConstraint("ano_publicacao <= EXTRACT(YEAR FROM CURRENT_DATE)", name="check_ano_publicacao"),
        CheckConstraint("numero_copias >= 0", name="check_numero_copias"),
    )


    
