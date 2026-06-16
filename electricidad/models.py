"""Modelo de datos (SQLAlchemy ORM).

Diseño orientado a trazabilidad: toda fila de hechos conserva su `fuente` y
`actualizado_en`. La tabla `etl_run` registra cada ejecución del pipeline.
Compatible con SQLite y PostgreSQL sin cambios.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    actualizado_en: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )
    fuente: Mapped[str] = mapped_column(String(255), default="")


# ── Capacidad instalada ─────────────────────────────────────────────────────
class CapacidadInstalada(Base, TimestampMixin):
    __tablename__ = "capacidad_instalada"
    __table_args__ = (
        UniqueConstraint("fecha", "region", "tecnologia", "empresa", name="uq_capacidad"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha: Mapped[str] = mapped_column(String(10), index=True)  # YYYY-MM-01
    region: Mapped[str] = mapped_column(String(80), index=True, default="Nacional")
    tecnologia: Mapped[str] = mapped_column(String(60), index=True)
    combustible: Mapped[str] = mapped_column(String(60), default="")
    empresa: Mapped[str] = mapped_column(String(160), default="")
    potencia_mw: Mapped[float] = mapped_column(Float, default=0.0)
    es_ernc: Mapped[bool] = mapped_column(Boolean, default=False)


# ── Generación ──────────────────────────────────────────────────────────────
class Generacion(Base, TimestampMixin):
    __tablename__ = "generacion"
    __table_args__ = (
        UniqueConstraint("fecha", "region", "tecnologia", "empresa", name="uq_generacion"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha: Mapped[str] = mapped_column(String(10), index=True)
    region: Mapped[str] = mapped_column(String(80), index=True, default="Nacional")
    tecnologia: Mapped[str] = mapped_column(String(60), index=True)
    empresa: Mapped[str] = mapped_column(String(160), default="")
    energia_gwh: Mapped[float] = mapped_column(Float, default=0.0)
    es_ernc: Mapped[bool] = mapped_column(Boolean, default=False)


# ── PMGD ────────────────────────────────────────────────────────────────────
class PMGD(Base, TimestampMixin):
    __tablename__ = "pmgd"
    __table_args__ = (UniqueConstraint("nombre", name="uq_pmgd_nombre"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(200), index=True)
    region: Mapped[str] = mapped_column(String(80), index=True, default="")
    comuna: Mapped[str] = mapped_column(String(120), default="")
    tecnologia: Mapped[str] = mapped_column(String(60), index=True, default="")
    potencia_mw: Mapped[float] = mapped_column(Float, default=0.0)
    estado: Mapped[str] = mapped_column(String(40), index=True, default="")  # Operación/Construcción
    lat: Mapped[float] = mapped_column(Float, nullable=True)
    lon: Mapped[float] = mapped_column(Float, nullable=True)
    fecha_operacion: Mapped[str] = mapped_column(String(10), default="")


# ── Almacenamiento (BESS) ───────────────────────────────────────────────────
class Almacenamiento(Base, TimestampMixin):
    __tablename__ = "almacenamiento"
    __table_args__ = (UniqueConstraint("nombre", name="uq_alm_nombre"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    nombre: Mapped[str] = mapped_column(String(200), index=True)
    region: Mapped[str] = mapped_column(String(80), index=True, default="")
    tecnologia: Mapped[str] = mapped_column(String(60), default="BESS")
    potencia_mw: Mapped[float] = mapped_column(Float, default=0.0)
    energia_mwh: Mapped[float] = mapped_column(Float, default=0.0)
    estado: Mapped[str] = mapped_column(String(40), index=True, default="")
    propietario: Mapped[str] = mapped_column(String(160), default="")
    fecha: Mapped[str] = mapped_column(String(10), default="")


# ── Demanda ─────────────────────────────────────────────────────────────────
class Demanda(Base, TimestampMixin):
    __tablename__ = "demanda"
    __table_args__ = (
        UniqueConstraint("fecha", "region", "sector", name="uq_demanda"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fecha: Mapped[str] = mapped_column(String(10), index=True)
    region: Mapped[str] = mapped_column(String(80), index=True, default="Nacional")
    sector: Mapped[str] = mapped_column(String(60), default="Total")
    demanda_gwh: Mapped[float] = mapped_column(Float, default=0.0)
    demanda_maxima_mw: Mapped[float] = mapped_column(Float, default=0.0)


# ── Reportes CNE ────────────────────────────────────────────────────────────
class ReporteCNE(Base, TimestampMixin):
    __tablename__ = "reportes_cne"
    __table_args__ = (UniqueConstraint("tipo", "periodo", name="uq_reporte"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tipo: Mapped[str] = mapped_column(String(120), index=True)
    titulo: Mapped[str] = mapped_column(String(300), default="")
    periodo: Mapped[str] = mapped_column(String(20), index=True, default="")  # YYYY-MM
    fecha_publicacion: Mapped[str] = mapped_column(String(10), default="")
    url: Mapped[str] = mapped_column(Text, default="")
    ruta_local: Mapped[str] = mapped_column(Text, default="")
    hash_archivo: Mapped[str] = mapped_column(String(64), default="")
    tablas_json: Mapped[str] = mapped_column(Text, default="")  # tablas extraídas


# ── Proyectos de ley ────────────────────────────────────────────────────────
class ProyectoLey(Base, TimestampMixin):
    __tablename__ = "proyectos_ley"
    __table_args__ = (UniqueConstraint("boletin", name="uq_boletin"),)
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    boletin: Mapped[str] = mapped_column(String(40), index=True)
    titulo: Mapped[str] = mapped_column(Text, default="")
    camara_origen: Mapped[str] = mapped_column(String(60), default="")
    estado: Mapped[str] = mapped_column(String(120), index=True, default="")
    comision: Mapped[str] = mapped_column(String(160), default="")
    urgencia: Mapped[str] = mapped_column(String(60), default="")
    tema: Mapped[str] = mapped_column(String(80), index=True, default="")
    fecha_ingreso: Mapped[str] = mapped_column(String(10), default="")
    ultimo_movimiento: Mapped[str] = mapped_column(Text, default="")
    fecha_movimiento: Mapped[str] = mapped_column(String(10), default="")
    url: Mapped[str] = mapped_column(Text, default="")


# ── Alertas ─────────────────────────────────────────────────────────────────
class Alerta(Base):
    __tablename__ = "alertas"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    tipo: Mapped[str] = mapped_column(String(60), index=True)
    severidad: Mapped[str] = mapped_column(String(20), default="info")  # info/aviso/critico
    titulo: Mapped[str] = mapped_column(String(300))
    detalle: Mapped[str] = mapped_column(Text, default="")
    modulo: Mapped[str] = mapped_column(String(40), index=True, default="")
    creada_en: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    leida: Mapped[bool] = mapped_column(Boolean, default=False)
    clave: Mapped[str] = mapped_column(String(200), default="", index=True)  # dedupe


# ── Trazabilidad de ejecuciones ETL ─────────────────────────────────────────
class EtlRun(Base):
    __tablename__ = "etl_run"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    fuente: Mapped[str] = mapped_column(String(60), index=True)
    inicio: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    fin: Mapped[datetime] = mapped_column(DateTime, nullable=True)
    estado: Mapped[str] = mapped_column(String(20), default="ok")  # ok/error/sin_red
    filas: Mapped[int] = mapped_column(Integer, default=0)
    mensaje: Mapped[str] = mapped_column(Text, default="")
    modo: Mapped[str] = mapped_column(String(20), default="live")  # live/seed
