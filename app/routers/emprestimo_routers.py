from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.schemas.emprestimo_schemas import EmprestimoCreateSchema, EmprestimoUpdateSchema, EmprestimoResponseSchema
from app.repositories.emprestimo_repo import criar_emprestimo, atualizar_emprestimo, obter_emprestimos, deletar_emprestimo
from app.db.session import get_db
from app.core.security import verifica_role
from typing import Any

router = APIRouter(prefix="/emprestimos", tags=["Empréstimos"])

@router.post("/", response_model=EmprestimoResponseSchema)
def cadastrar_novo_emprestimo(emprestimo: EmprestimoCreateSchema, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario", "leitor"]))):
    return criar_emprestimo(db, emprestimo)

@router.put("/{emprestimo_id}", response_model=EmprestimoResponseSchema)
def atualizar_dados_emprestimo(emprestimo_id: int, emprestimo: EmprestimoUpdateSchema, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return atualizar_emprestimo(db, emprestimo_id, emprestimo)

@router.get("/", response_model=list[EmprestimoResponseSchema])
def obter_todos_emprestimos(db: Session = Depends(get_db)):  
    emprestimo = obter_emprestimos(db)
    if not emprestimo:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado")
    return emprestimo

@router.delete("/{emprestimo_id}", status_code=204)
def deletar_dados_emprestimo(emprestimo_id: int, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    deletar_emprestimo(db, emprestimo_id)



