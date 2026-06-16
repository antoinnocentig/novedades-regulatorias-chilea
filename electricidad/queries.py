"""Capa de lectura: consultas que devuelven DataFrames para la app."""
from __future__ import annotations

import pandas as pd
from sqlalchemy import func, select

from .db import engine, get_session
from .models import (
    Alerta,
    Almacenamiento,
    CapacidadInstalada,
    Demanda,
    EtlRun,
    Generacion,
    PMGD,
    ProyectoLey,
    ReporteCNE,
)


def _df(model) -> pd.DataFrame:
    return pd.read_sql(select(model), engine)


def capacidad() -> pd.DataFrame:
    return _df(CapacidadInstalada)


def generacion() -> pd.DataFrame:
    return _df(Generacion)


def demanda() -> pd.DataFrame:
    return _df(Demanda)


def pmgd() -> pd.DataFrame:
    return _df(PMGD)


def almacenamiento() -> pd.DataFrame:
    return _df(Almacenamiento)


def reportes() -> pd.DataFrame:
    return _df(ReporteCNE)


def proyectos_ley() -> pd.DataFrame:
    return _df(ProyectoLey)


def alertas() -> pd.DataFrame:
    return pd.read_sql(select(Alerta).order_by(Alerta.creada_en.desc()), engine)


def etl_runs() -> pd.DataFrame:
    return pd.read_sql(select(EtlRun).order_by(EtlRun.inicio.desc()).limit(50), engine)


def hay_datos() -> bool:
    with get_session() as s:
        return (s.execute(select(func.count(CapacidadInstalada.id))).scalar_one() or 0) > 0


def ultima_actualizacion() -> str:
    with get_session() as s:
        v = s.execute(select(func.max(EtlRun.fin))).scalar()
    return v.strftime("%Y-%m-%d %H:%M UTC") if v else "—"


def modo_datos() -> str:
    """Devuelve 'live' o 'seed' según la última ejecución de capacidad."""
    with get_session() as s:
        v = s.execute(
            select(EtlRun.modo).where(EtlRun.fuente == "capacidad")
            .order_by(EtlRun.inicio.desc()).limit(1)
        ).scalar()
    return v or "seed"
