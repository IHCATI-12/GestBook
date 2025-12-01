from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.schemas.emprestimo_schemas import EmprestimoCreateSchema, EmprestimoUpdateSchema, EmprestimoResponseSchema, StatusEmprestimoEnum, DevolucaoSchema
from app.repositories.emprestimo_repo import criar_emprestimo, atualizar_emprestimo, obter_emprestimos, deletar_emprestimo, devolver_emprestimo, obter_emprestimos_por_leitor
from app.db.session import get_db
from app.core.security import verifica_role
from typing import Any

router = APIRouter(prefix="/emprestimos", tags=["Empréstimos"])

# Rota para cadastrar um novo empréstimo
@router.post("/", response_model=EmprestimoResponseSchema)
def cadastrar_novo_emprestimo(emprestimo: EmprestimoCreateSchema, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario", "leitor"]))):
    return criar_emprestimo(db, emprestimo)

# Rota para atualizar os dados de um empréstimo existente
@router.put("/{emprestimo_id}", response_model=EmprestimoResponseSchema)
def atualizar_dados_emprestimo(emprestimo_id: int, emprestimo: EmprestimoUpdateSchema, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    return atualizar_emprestimo(db, emprestimo_id, emprestimo)

# Rota para obter todos os empréstimos
@router.get("/", response_model=list[EmprestimoResponseSchema])
def obter_todos_emprestimos(db: Session = Depends(get_db)):  
    emprestimo = obter_emprestimos(db)
    if not emprestimo:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado")
    return emprestimo

# Rota para obter empréstimos por leitor 
@router.get("/leitor/{leitor_id}", response_model=list[EmprestimoResponseSchema])
def obter_emprestimos_leitor(leitor_id: int, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario", "leitor"]))):
    emprestimos = obter_emprestimos_por_leitor(db, leitor_id)
    if not emprestimos:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado para o leitor especificado")
    return emprestimos

# Rota para deletar um empréstimo pelo ID
@router.delete("/{emprestimo_id}", status_code=204)
def deletar_dados_emprestimo(emprestimo_id: int, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario"]))):
    deletar_emprestimo(db, emprestimo_id)

# Rota para finalizar um empréstimo (devolver o livro)
@router.post("/{emprestimo_id}/devolver", response_model=EmprestimoResponseSchema)
def devolver_livro(emprestimo_id: int, devolucao: DevolucaoSchema, db: Session = Depends(get_db), usuario: Any = Depends(verifica_role(["bibliotecario", "leitor"]))):
    return devolver_emprestimo(db, emprestimo_id, devolucao.data_devolucao_real, devolucao.bibliotecario_devolucao_id)



