"""Arranque idempotente: garantiza esquema y datos al abrir la app."""
from __future__ import annotations

import logging

from .config import AUTO_SEED
from .db import get_session, init_db
from .load import upsert
from .models import Almacenamiento, ProyectoLey, ReporteCNE
from . import seed
from .load import replace_table
from .models import CapacidadInstalada, Demanda, Generacion, PMGD
from .queries import hay_datos

log = logging.getLogger("bootstrap")


def asegurar_datos() -> None:
    """Crea tablas y, si la BD está vacía, la siembra (modo demo/offline).

    Para datos en vivo se debe ejecutar el pipeline (scripts/run_etl.py); esto
    sólo evita que la primera apertura muestre un dashboard vacío.
    """
    init_db()
    if hay_datos() or not AUTO_SEED:
        return
    log.info("BD vacía: sembrando datos de respaldo…")
    with get_session() as s:
        replace_table(s, CapacidadInstalada, seed.capacidad_rows())
        replace_table(s, Generacion, seed.generacion_rows())
        replace_table(s, Demanda, seed.demanda_rows())
        replace_table(s, PMGD, seed.pmgd_rows())
        replace_table(s, Almacenamiento, seed.almacenamiento_rows())
        upsert(s, ReporteCNE, seed.reportes_rows(), keys=["tipo", "periodo"])
        upsert(s, ProyectoLey, seed.proyectos_ley_rows(), keys=["boletin"])
