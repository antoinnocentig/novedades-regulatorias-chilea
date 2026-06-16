"""Carga de datos a la base (upsert por clave natural y reemplazo total)."""
from __future__ import annotations

from typing import Sequence, Type

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .models import Base


def replace_table(session: Session, model: Type[Base], rows: list[dict]) -> int:
    """Reemplaza por completo el contenido de una tabla (refresh de snapshot)."""
    if not rows:
        return 0
    session.execute(delete(model))
    session.flush()
    session.bulk_insert_mappings(model, rows)
    return len(rows)


def upsert(session: Session, model: Type[Base], rows: list[dict],
           keys: Sequence[str]) -> tuple[int, list[dict]]:
    """Inserta/actualiza por clave natural. Devuelve (n_filas, filas_nuevas).

    `filas_nuevas` permite a la capa de alertas saber qué apareció por primera
    vez (nuevos reportes, nuevos proyectos de ley, etc.).
    """
    if not rows:
        return 0, []
    nuevos: list[dict] = []
    for row in rows:
        cond = [getattr(model, k) == row[k] for k in keys]
        existing = session.execute(select(model).where(*cond)).scalar_one_or_none()
        if existing is None:
            session.add(model(**row))
            nuevos.append(row)
        else:
            for k, v in row.items():
                setattr(existing, k, v)
    session.flush()
    return len(rows), nuevos
