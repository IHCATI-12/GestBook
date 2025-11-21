from sqlalchemy import Column, Integer, String, DateTime, text
from app.db.base import Base
from enum import Enum

# Definição do modelo para a coluna 'role' com valores possíveis
class roleEnum(str, Enum):
    LEITOR = "leitor"
    BIBLIOTECARIO = "bibliotecario"

class Usuario(Base):
    __tablename__ = "usuarios"

    usuario_id = Column(Integer, primary_key=True, index=True, nullable=False)
    nome = Column(String(255), index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default=roleEnum.LEITOR.value)  # Usando o Enum para definir valores possíveis
    data_cadastro = Column(DateTime(timezone=False), server_default=text("CURRENT_TIMESTAMP"))

