from app.models.autores_models import Autor
from app.schemas.autores_schemas import AutorCreateSchema, AutorResponseSchema
from typing import Optional


def buscar_autor_por_id(db, autor_id: int) -> Optional[Autor]:
    return db.query(Autor).filter(Autor.autor_id == autor_id).first()