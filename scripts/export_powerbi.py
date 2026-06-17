#!/usr/bin/env python3
"""Exporta la base de datos a un formato consumible por Power BI.

Genera, en el directorio de salida (por defecto ./powerbi_export):
  * un CSV por cada tabla de hechos/dimensión,
  * un único Excel multi-hoja (mercado_electrico.xlsx),
  * un diccionario de datos (diccionario_datos.csv).

Power BI puede conectarse a:
  - la carpeta de CSV  (Obtener datos → Carpeta),
  - el Excel           (Obtener datos → Excel),
  - directamente a la BD (Obtener datos → PostgreSQL) usando DATABASE_URL,
  - o ejecutar el ETL  (Obtener datos → Script de Python).

Uso:
    python scripts/export_powerbi.py [directorio_salida]
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd  # noqa: E402

from electricidad import queries  # noqa: E402
from electricidad.bootstrap import asegurar_datos  # noqa: E402

# Tabla -> (función de consulta, descripción para el diccionario)
TABLAS = {
    "capacidad_instalada": (queries.capacidad, "Capacidad instalada (MW) por fecha, región, tecnología y empresa"),
    "generacion":          (queries.generacion, "Generación (GWh) por fecha, región y tecnología"),
    "demanda":             (queries.demanda, "Demanda (GWh) y demanda máxima (MW) por fecha y sector"),
    "pmgd":                (queries.pmgd, "Pequeños Medios de Generación Distribuida (incluye lat/lon para mapas)"),
    "almacenamiento":      (queries.almacenamiento, "Proyectos de almacenamiento BESS (MW/MWh y estado)"),
    "reportes_cne":        (queries.reportes, "Reportes CNE detectados (tipo, periodo, URL)"),
    "proyectos_ley":       (queries.proyectos_ley, "Proyectos de ley del sector energético en tramitación"),
    "alertas":             (queries.alertas, "Alertas automáticas generadas por el pipeline"),
    "etl_run":             (queries.etl_runs, "Trazabilidad de ejecuciones del ETL"),
}


def exportar(salida: Path) -> dict[str, int]:
    salida.mkdir(parents=True, exist_ok=True)
    asegurar_datos()  # garantiza que haya datos que exportar

    resumen: dict[str, int] = {}
    diccionario = []
    hojas: dict[str, pd.DataFrame] = {}

    for nombre, (fn, desc) in TABLAS.items():
        df = fn()
        df.to_csv(salida / f"{nombre}.csv", index=False, encoding="utf-8-sig")
        hojas[nombre[:31]] = df
        resumen[nombre] = len(df)
        for col in df.columns:
            diccionario.append({"tabla": nombre, "columna": col,
                                "tipo": str(df[col].dtype), "descripcion_tabla": desc})

    pd.DataFrame(diccionario).to_csv(
        salida / "diccionario_datos.csv", index=False, encoding="utf-8-sig")

    with pd.ExcelWriter(salida / "mercado_electrico.xlsx", engine="xlsxwriter") as xw:
        for hoja, df in hojas.items():
            df.to_excel(xw, sheet_name=hoja, index=False)

    return resumen


if __name__ == "__main__":
    destino = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("powerbi_export")
    res = exportar(destino)
    print(f"✅ Exportado a {destino.resolve()}")
    for tabla, n in res.items():
        print(f"   {tabla:22} {n:>6} filas")
