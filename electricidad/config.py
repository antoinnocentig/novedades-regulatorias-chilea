"""Configuración central del proyecto (rutas, BD, carga de sources.yaml)."""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path

import yaml
from dotenv import load_dotenv

# Raíz del repositorio (este archivo vive en electricidad/)
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
CONFIG_DIR = ROOT / "config"
REPORTS_DIR = DATA_DIR / "reportes_cne"

DATA_DIR.mkdir(exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

load_dotenv(ROOT / ".env")


def database_url() -> str:
    """URL de conexión SQLAlchemy.

    Por defecto SQLite (cero configuración). En producción basta con
    definir DATABASE_URL apuntando a PostgreSQL para migrar sin tocar código:
        postgresql+psycopg2://user:pass@host:5432/energia
    """
    return os.getenv("DATABASE_URL", f"sqlite:///{DATA_DIR / 'energia.db'}")


@lru_cache(maxsize=1)
def sources() -> dict:
    """Catálogo de fuentes (config/sources.yaml)."""
    with open(CONFIG_DIR / "sources.yaml", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


# Permitir forzar uso exclusivo de datos sembrados (útil sin red / demo).
OFFLINE_ONLY = os.getenv("OFFLINE_ONLY", "false").lower() in {"1", "true", "yes"}

# Activar/desactivar el sembrado automático cuando la BD esté vacía.
AUTO_SEED = os.getenv("AUTO_SEED", "true").lower() in {"1", "true", "yes"}
