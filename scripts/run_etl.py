#!/usr/bin/env python3
"""Ejecuta el pipeline ETL completo (extracción en vivo + alertas).

Uso:
    python scripts/run_etl.py
Variables de entorno relevantes:
    DATABASE_URL   conexión SQLAlchemy (def. SQLite en data/energia.db)
    OFFLINE_ONLY   'true' para forzar datos de respaldo (sin red)
    AUTO_SEED      'false' para no sembrar cuando no hay datos en vivo
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from electricidad.pipeline import ejecutar  # noqa: E402

if __name__ == "__main__":
    resumen = ejecutar()
    print(json.dumps(resumen, indent=2, ensure_ascii=False))
