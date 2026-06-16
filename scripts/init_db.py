#!/usr/bin/env python3
"""Crea el esquema de base de datos y siembra datos de respaldo si está vacía."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from electricidad.bootstrap import asegurar_datos  # noqa: E402

if __name__ == "__main__":
    asegurar_datos()
    print("✅ Base de datos inicializada.")
