from app.models.emprestimo_models import Emprestimo
from app.schemas.emprestimo_schemas import EmprestimoCreateSchema, EmprestimoUpdateSchema, EmprestimoResponseSchema
from sqlalchemy.orm import Session
from fastapi import HTTPException

def criar_emprestimo(db: Session, emprestimo: EmprestimoCreateSchema) -> Emprestimo:
    novo_emprestimo = Emprestimo(
        livro_id=emprestimo.livro_id,
        leitor_id=emprestimo.leitor_id,
        bibliotecario_id=emprestimo.bibliotecario_id,
        data_devolucao_prevista=emprestimo.data_devolucao_prevista
    )
    db.add(novo_emprestimo)
    db.commit()
    db.refresh(novo_emprestimo)
    return novo_emprestimo

def atualizar_emprestimo(db: Session, emprestimo_id: int, emprestimo_atualizado: EmprestimoUpdateSchema) -> Emprestimo:
    emprestimo_db = db.query(Emprestimo).filter(Emprestimo.emprestimo_id == emprestimo_id).first()
    if not emprestimo_db:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado")

    if emprestimo_atualizado.livro_id is not None:
        emprestimo_db.livro_id = emprestimo_atualizado.livro_id # type: ignore
    if emprestimo_atualizado.leitor_id is not None:
        emprestimo_db.leitor_id = emprestimo_atualizado.leitor_id # type: ignore
    if emprestimo_atualizado.bibliotecario_id is not None:
        emprestimo_db.bibliotecario_id = emprestimo_atualizado.bibliotecario_id # type: ignore
    if emprestimo_atualizado.data_devolucao_prevista is not None:
        emprestimo_db.data_devolucao_prevista = emprestimo_atualizado.data_devolucao_prevista # type: ignore
    if emprestimo_atualizado.data_devolucao_real is not None:
        emprestimo_db.data_devolucao_real = emprestimo_atualizado.data_devolucao_real # type: ignore
    if emprestimo_atualizado.status_emprestimo is not None:
        emprestimo_db.status_emprestimo = emprestimo_atualizado.status_emprestimo # type: ignore

    db.commit()
    db.refresh(emprestimo_db)
    return emprestimo_db

def obter_emprestimos(db: Session) -> list[Emprestimo]:
    return db.query(Emprestimo).all()

def deletar_emprestimo(db: Session, emprestimo_id: int) -> None:
    emprestimo_db = db.query(Emprestimo).filter(Emprestimo.emprestimo_id == emprestimo_id).first()
    if not emprestimo_db:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado")
    
    db.delete(emprestimo_db)
    db.commit()

