from sqlalchemy import Column, Integer, String, DateTime, text, CheckConstraint, ForeignKey
from app.db.base import Base
from enum import Enum
from datetime import date

# Definição do modelo para a coluna 'status_emprestimo' com valores possíveis
class status_emprestimoEnum(str, Enum):
    EMPRESTADO = "Emprestado" 
    DEVOLVIDO = "Devolvido"

# Definição do modelo Emprestimo
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
    
    # Propriedade para verificar se o empréstimo está atrasado
    @property
    def is_atrasado(self) -> bool:
        hoje = date.today()
        # Verifica se a data de devolução prevista existe
        if not self.data_devolucao_prevista: # type: ignore
            return False
        # Obtém apenas a parte da data (sem hora)
        data_prevista = self.data_devolucao_prevista.date()
        # Verifica se o empréstimo está ativo
        is_ativo = self.status_emprestimo.lower() == status_emprestimoEnum.EMPRESTADO.value.lower()
        return is_ativo and (data_prevista < hoje)
        
    # ---- CHECK Constraints ----
    __table_args__ = (
        # Garantir que o status do empréstimo seja um dos valores permitidos
        CheckConstraint("status_emprestimo IN ('Emprestado', 'Devolvido', 'Atrasado')", name="check_status_emprestimo"),
        CheckConstraint( "data_devolucao_prevista > data_emprestimo", name="chk_devolucao_datas"))
    
