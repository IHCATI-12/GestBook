from app.models.emprestimo_models import Emprestimo
from app.models.livro_models import Livro
from app.schemas.emprestimo_schemas import EmprestimoCreateSchema, EmprestimoUpdateSchema, StatusEmprestimoEnum
from sqlalchemy.orm import Session
from fastapi import HTTPException

# Função para criar um novo empréstimo e atualizar o número de cópias do livro com funcoes de estoque em livros_repo
def criar_emprestimo(db: Session, emprestimo: EmprestimoCreateSchema, ) -> Emprestimo:
    numero_copias = db.query(Livro.numero_copias).filter(Livro.livro_id == emprestimo.livro_id).first()
    if not numero_copias or numero_copias[0] <= 0:
        raise HTTPException(status_code=400, detail="Não há cópias disponíveis para empréstimo")
    numero_copias_atualizado = numero_copias[0] - 1
    db.query(Livro).filter(Livro.livro_id == emprestimo.livro_id).update({"numero_copias": numero_copias_atualizado})
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

# Função para atualizar os dados de um empréstimo existente
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

# Função para obter todos os empréstimos
def obter_emprestimos(db: Session) -> list[Emprestimo]:
    return db.query(Emprestimo).all()

# Funcao para obter emprestimos por leitor
def obter_emprestimos_por_leitor(db: Session, leitor_id: int) -> list[Emprestimo]:
    return db.query(Emprestimo).filter(Emprestimo.leitor_id == leitor_id).all()

# Função para deletar um empréstimo pelo ID
def deletar_emprestimo(db: Session, emprestimo_id: int) -> None:
    emprestimo_db = db.query(Emprestimo).filter(Emprestimo.emprestimo_id == emprestimo_id).first()
    if emprestimo_db:
        db.delete(emprestimo_db)

# Função para devolver o livro e atualizar o número de cópias
def devolver_emprestimo(db: Session, emprestimo_id: int, data_devolucao_real, bibliotecario_id: int) -> Emprestimo:
    emprestimo_db = db.query(Emprestimo).filter(Emprestimo.emprestimo_id == emprestimo_id).first()
    if not emprestimo_db:
        raise HTTPException(status_code=404, detail="Empréstimo não encontrado")
        
    # Lógica de atualização de cópias
    numero_copias = db.query(Livro.numero_copias).filter(Livro.livro_id == emprestimo_db.livro_id).first()
    numero_copias_atualizado = numero_copias[0] + 1 # type: ignore
    db.query(Livro).filter(Livro.livro_id == emprestimo_db.livro_id).update({"numero_copias": numero_copias_atualizado})

    emprestimo_db.data_devolucao_real = data_devolucao_real
    emprestimo_db.bibliotecario_id = bibliotecario_id # type: ignore
    emprestimo_db.status_emprestimo = StatusEmprestimoEnum.DEVOLVIDO # type: ignore
    db.commit()
    db.refresh(emprestimo_db)
    return emprestimo_db