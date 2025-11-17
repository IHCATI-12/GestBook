from sqlalchemy import Column, Integer, String, DateTime, text, CheckConstraint, ForeignKey
from app.db.base import Base
from enum import Enum

# Definição do modelo para a coluna 'status_emprestimo' com valores possíveis
class status_emprestimoEnum(str, Enum):
    EMPRESTADO = "Emprestado" 
    DEVOLVIDO = "Devolvido"
    ATRASADO = "Atrasado"

class Emprestimo(Base):
    __tablename__ = "emprestimo"

    emprestimo_id = Column(Integer, primary_key=True, index=True)
    livro_id = Column(Integer, ForeignKey("livro.livro_id", ondelete="RESTRICT"), nullable=False)
    leitor_id = Column(Integer, ForeignKey("usuarios.usuario_id", ondelete="RESTRICT"), nullable=False)
    bibliotecario_id = Column(Integer, ForeignKey("usuarios.usuario_id", ondelete="RESTRICT"), nullable=False)
    data_emprestimo = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    data_devolucao_prevista = Column(DateTime, nullable=False)
    data_devolucao_real = Column(DateTime, nullable=True)
    status_emprestimo = Column(String(15), nullable=False, default=status_emprestimoEnum.EMPRESTADO.value)

    # ---- CHECK Constraints ----
    __table_args__ = (
        CheckConstraint("status_emprestimo IN ('Emprestado', 'Devolvido', 'Atrasado')", name="check_status_emprestimo"),
        CheckConstraint( "data_devolucao_prevista > data_emprestimo", name="chk_devolucao_datas"))

    
