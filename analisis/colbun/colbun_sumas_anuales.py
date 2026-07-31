"""
Suma anual por columna para la empresa Colbún, con tabla + gráfico.

Calcula, para cada una de las tres tablas, la suma anual de una columna
determinada filtrando por la empresa Colbún y genera:
  - un CSV con la tabla (una fila por año)
  - un PNG con el gráfico de barras (un año por barra)
además de un CSV y un PNG combinados con las tres series.

Tablas y columnas sumadas:
  1. cat02_produccion_genergias.mercados.tb_balance_energia_rpa           -> "valorizado"
  2. cat02_produccion_genergias.mercados.tb_balance_precio_estabilizado_rpa -> "diferencia horaria"
  3. cat02_produccion_genergias.mercados.tb_sobrecosto_scmt_neto_rpa       -> "asignación"

Se conecta a Databricks (Unity Catalog: catalogo.esquema.tabla). El nombre de
las columnas de año / empresa se detecta automáticamente inspeccionando el
esquema (DESCRIBE), pero se puede forzar en OVERRIDES si la detección falla.

Uso:
    pip install -r requirements.txt
    export DATABRICKS_SERVER_HOSTNAME="adb-xxxx.azuredatabricks.net"
    export DATABRICKS_HTTP_PATH="/sql/1.0/warehouses/xxxxxxxx"
    export DATABRICKS_TOKEN="dapiXXXXXXXX"
    python colbun_sumas_anuales.py
"""

from __future__ import annotations

import os
import re
import sys
import unicodedata
from dataclasses import dataclass, field

import matplotlib

matplotlib.use("Agg")  # backend sin interfaz gráfica (guarda a archivo)
import matplotlib.pyplot as plt
import matplotlib.ticker
import pandas as pd

# --------------------------------------------------------------------------- #
# Configuración
# --------------------------------------------------------------------------- #

EMPRESA = "COLBUN"        # se busca por coincidencia parcial, sin acentos
SALIDAS = "salidas"       # carpeta de salida para CSV y PNG

COLOR = "#2a78d6"         # azul (paleta categórica validada, slot 1)
COLOR_LABEL = "#0b0b0b"   # tinta de texto
COLOR_AXIS = "#8a8a86"    # ejes / grilla recesivos


@dataclass
class Consulta:
    """Una tabla + la columna cuya suma anual se quiere calcular."""
    tabla: str            # nombre completo catalogo.esquema.tabla
    columna_valor: str    # nombre "humano" de la columna a sumar
    titulo: str           # título del gráfico
    slug: str             # nombre base de los archivos de salida
    unidad: str = ""      # unidad opcional para el eje Y
    # overrides manuales (si la autodetección no acierta):
    col_empresa: str | None = None
    col_anio: str | None = None
    col_fecha: str | None = None


CONSULTAS: list[Consulta] = [
    Consulta(
        tabla="cat02_produccion_genergias.mercados.tb_balance_energia_rpa",
        columna_valor="valorizado",
        titulo="Colbún · Suma anual de «valorizado»\nBalance de energía",
        slug="balance_energia_valorizado",
    ),
    Consulta(
        tabla="cat02_produccion_genergias.mercados.tb_balance_precio_estabilizado_rpa",
        columna_valor="diferencia horaria",
        titulo="Colbún · Suma anual de «diferencia horaria»\nBalance precio estabilizado",
        slug="precio_estabilizado_diferencia_horaria",
    ),
    Consulta(
        tabla="cat02_produccion_genergias.mercados.tb_sobrecosto_scmt_neto_rpa",
        columna_valor="asignación",
        titulo="Colbún · Suma anual de «asignación»\nSobrecosto SCMT neto",
        slug="sobrecosto_scmt_asignacion",
    ),
]

# Candidatos de nombre para la columna de empresa (normalizados, sin acentos).
CANDIDATOS_EMPRESA = [
    "empresa", "nombreempresa", "empresacoordinada", "empresapropietaria",
    "propietario", "coordinado", "razonsocial", "agente", "participante",
    "cliente", "titular", "nombre",
]
# Candidatos de nombre para una columna de año explícita.
CANDIDATOS_ANIO = ["anio", "ano", "agno", "year", "ejercicio"]
# Candidatos de nombre para una columna de fecha (se extrae el año con YEAR()).
CANDIDATOS_FECHA = ["fecha", "fechaoperacion", "fechahora", "date", "periodo", "dia"]


# --------------------------------------------------------------------------- #
# Utilidades
# --------------------------------------------------------------------------- #

def normalizar(texto: str) -> str:
    """minúsculas, sin acentos, sólo alfanumérico -> para comparar nombres."""
    t = unicodedata.normalize("NFKD", texto)
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", t.lower())


def q(identificador: str) -> str:
    """Cita un identificador con backticks para SQL de Databricks/Spark."""
    return "`" + identificador.replace("`", "``") + "`"


def get_connection():
    """Abre una conexión Databricks SQL a partir de variables de entorno."""
    try:
        from databricks import sql  # type: ignore
    except ImportError:
        sys.exit(
            "Falta el conector. Instala con:\n"
            "    pip install -r requirements.txt\n"
            "(o: pip install databricks-sql-connector)"
        )

    host = os.environ.get("DATABRICKS_SERVER_HOSTNAME")
    http_path = os.environ.get("DATABRICKS_HTTP_PATH")
    token = os.environ.get("DATABRICKS_TOKEN")
    faltan = [n for n, v in [
        ("DATABRICKS_SERVER_HOSTNAME", host),
        ("DATABRICKS_HTTP_PATH", http_path),
        ("DATABRICKS_TOKEN", token),
    ] if not v]
    if faltan:
        sys.exit("Faltan variables de entorno: " + ", ".join(faltan))

    return sql.connect(
        server_hostname=host,
        http_path=http_path,
        access_token=token,
    )


def columnas_de(conn, tabla: str) -> list[tuple[str, str]]:
    """Devuelve [(nombre, tipo), ...] de la tabla usando DESCRIBE."""
    cols: list[tuple[str, str]] = []
    with conn.cursor() as cur:
        cur.execute(f"DESCRIBE TABLE {tabla}")
        for fila in cur.fetchall():
            nombre = (fila[0] or "").strip()
            tipo = (fila[1] or "").strip() if len(fila) > 1 else ""
            # DESCRIBE agrega secciones extra (particiones) tras una fila vacía
            if not nombre or nombre.startswith("#"):
                break
            cols.append((nombre, tipo))
    return cols


def elegir_columna(cols: list[str], candidatos: list[str]) -> str | None:
    """Elige de `cols` la que mejor coincide con la lista de candidatos.

    1) igualdad exacta normalizada  2) la columna contiene al candidato
    3) el candidato contiene a la columna. Respeta el orden de preferencia.
    """
    normal = {c: normalizar(c) for c in cols}
    for cand in candidatos:
        for c in cols:
            if normal[c] == cand:
                return c
    for cand in candidatos:
        for c in cols:
            if cand in normal[c] or (len(normal[c]) >= 3 and normal[c] in cand):
                return c
    return None


def es_tipo_fecha(tipo: str) -> bool:
    t = tipo.lower()
    return "date" in t or "timestamp" in t


def es_tipo_entero(tipo: str) -> bool:
    t = tipo.lower()
    return any(k in t for k in ("int", "bigint", "smallint", "short", "long"))


def resolver_columnas(consulta: Consulta, cols: list[tuple[str, str]]):
    """Determina (col_valor, col_empresa, expr_anio) para una consulta."""
    nombres = [c for c, _ in cols]
    tipos = {c: t for c, t in cols}

    # --- columna de valor ---
    objetivo = normalizar(consulta.columna_valor)
    col_valor = None
    for c in nombres:
        if normalizar(c) == objetivo:
            col_valor = c
            break
    if col_valor is None:
        col_valor = elegir_columna(nombres, [objetivo])
    if col_valor is None:
        raise ValueError(
            f"No encontré la columna de valor «{consulta.columna_valor}» en {consulta.tabla}.\n"
            f"Columnas disponibles: {nombres}"
        )

    # --- columna de empresa ---
    col_empresa = consulta.col_empresa or elegir_columna(nombres, CANDIDATOS_EMPRESA)
    if col_empresa is None:
        raise ValueError(
            f"No encontré una columna de empresa en {consulta.tabla}.\n"
            f"Define col_empresa= en OVERRIDES. Columnas: {nombres}"
        )

    # --- año: columna explícita, o extraído de una fecha ---
    if consulta.col_anio:
        expr_anio = q(consulta.col_anio)
    elif consulta.col_fecha:
        expr_anio = f"YEAR({q(consulta.col_fecha)})"
    else:
        col_anio = None
        for cand in CANDIDATOS_ANIO:
            for c in nombres:
                if normalizar(c) == cand and es_tipo_entero(tipos[c]):
                    col_anio = c
                    break
            if col_anio:
                break
        if col_anio:
            expr_anio = q(col_anio)
        else:
            col_fecha = None
            for cand in CANDIDATOS_FECHA:
                for c in nombres:
                    if cand in normalizar(c) and es_tipo_fecha(tipos[c]):
                        col_fecha = c
                        break
                if col_fecha:
                    break
            if col_fecha is None:
                for c in nombres:  # cualquier columna de fecha como último recurso
                    if es_tipo_fecha(tipos[c]):
                        col_fecha = c
                        break
            if col_fecha is None:
                raise ValueError(
                    f"No encontré columna de año ni de fecha en {consulta.tabla}.\n"
                    f"Define col_anio= o col_fecha= en OVERRIDES. Columnas: {nombres}"
                )
            expr_anio = f"YEAR({q(col_fecha)})"

    return col_valor, col_empresa, expr_anio


def suma_anual(conn, consulta: Consulta) -> pd.DataFrame:
    """Ejecuta la agregación y devuelve un DataFrame [anio, total]."""
    cols = columnas_de(conn, consulta.tabla)
    col_valor, col_empresa, expr_anio = resolver_columnas(consulta, cols)

    # filtro de empresa: normaliza acentos en SQL para tolerar «Colbún»
    empresa_norm = (
        f"translate(upper({q(col_empresa)}), 'ÁÉÍÓÚÜÑ', 'AEIOUUN')"
    )
    sql_txt = (
        f"SELECT {expr_anio} AS anio, "
        f"SUM(CAST({q(col_valor)} AS DOUBLE)) AS total\n"
        f"FROM {consulta.tabla}\n"
        f"WHERE {empresa_norm} LIKE '%{EMPRESA}%'\n"
        f"  AND {expr_anio} IS NOT NULL\n"
        f"GROUP BY {expr_anio}\n"
        f"ORDER BY anio"
    )
    print(f"\n[{consulta.slug}] columnas -> "
          f"valor={col_valor!r}, empresa={col_empresa!r}, anio={expr_anio}")
    print(sql_txt)

    with conn.cursor() as cur:
        cur.execute(sql_txt)
        filas = cur.fetchall()

    df = pd.DataFrame(filas, columns=["anio", "total"])
    df["anio"] = pd.to_numeric(df["anio"], errors="coerce").astype("Int64")
    df["total"] = pd.to_numeric(df["total"], errors="coerce")
    df = df.dropna(subset=["anio"]).sort_values("anio").reset_index(drop=True)
    return df


# --------------------------------------------------------------------------- #
# Gráficos
# --------------------------------------------------------------------------- #

def _formato_valor(v: float) -> str:
    a = abs(v)
    if a >= 1e9:
        return f"{v/1e9:.1f} B"
    if a >= 1e6:
        return f"{v/1e6:.1f} M"
    if a >= 1e3:
        return f"{v/1e3:.1f} k"
    return f"{v:,.0f}"


def grafico_barras(df: pd.DataFrame, consulta: Consulta) -> str:
    fig, ax = plt.subplots(figsize=(9, 5), dpi=130)
    anios = df["anio"].astype(int).astype(str).tolist()
    totales = df["total"].tolist()

    barras = ax.bar(anios, totales, color=COLOR, width=0.62, zorder=3)

    # etiquetas directas sobre cada barra
    for barra, val in zip(barras, totales):
        ax.annotate(
            _formato_valor(val),
            (barra.get_x() + barra.get_width() / 2, barra.get_height()),
            xytext=(0, 4), textcoords="offset points",
            ha="center", va="bottom", fontsize=9, color=COLOR_LABEL,
        )

    ax.set_title(consulta.titulo, fontsize=13, color=COLOR_LABEL, loc="left", pad=12)
    if consulta.unidad:
        ax.set_ylabel(consulta.unidad, fontsize=10, color=COLOR_AXIS)
    ax.margins(y=0.15)

    # ejes / grilla recesivos
    ax.grid(axis="y", color=COLOR_AXIS, alpha=0.25, linewidth=0.8, zorder=0)
    for lado in ("top", "right", "left"):
        ax.spines[lado].set_visible(False)
    ax.spines["bottom"].set_color(COLOR_AXIS)
    ax.tick_params(colors=COLOR_AXIS, labelcolor=COLOR_LABEL, length=0)
    ax.yaxis.set_major_formatter(
        matplotlib.ticker.FuncFormatter(lambda x, _: _formato_valor(x))
    )

    fig.tight_layout()
    ruta = os.path.join(SALIDAS, f"{consulta.slug}.png")
    fig.savefig(ruta, bbox_inches="tight", facecolor="white")
    plt.close(fig)
    return ruta


# --------------------------------------------------------------------------- #
# Main
# --------------------------------------------------------------------------- #

def main() -> None:
    os.makedirs(SALIDAS, exist_ok=True)
    conn = get_connection()
    combinado = []

    try:
        for consulta in CONSULTAS:
            try:
                df = suma_anual(conn, consulta)
            except Exception as e:  # noqa: BLE001 - reportar y seguir con las demás
                print(f"\n[ERROR] {consulta.slug}: {e}")
                continue

            if df.empty:
                print(f"\n[{consulta.slug}] sin registros para Colbún.")
                continue

            # tabla (CSV)
            ruta_csv = os.path.join(SALIDAS, f"{consulta.slug}.csv")
            df.to_csv(ruta_csv, index=False)

            # tabla por consola
            print(f"\n===== {consulta.slug} =====")
            print(df.to_string(index=False))

            # gráfico
            ruta_png = grafico_barras(df, consulta)
            print(f"CSV : {ruta_csv}")
            print(f"PNG : {ruta_png}")

            d = df.rename(columns={"total": consulta.slug}).set_index("anio")
            combinado.append(d[consulta.slug])
    finally:
        conn.close()

    # tabla + gráfico combinados
    if combinado:
        tabla = pd.concat(combinado, axis=1).sort_index()
        ruta = os.path.join(SALIDAS, "combinado_por_anio.csv")
        tabla.to_csv(ruta)
        print("\n===== combinado por año =====")
        print(tabla.to_string())
        print(f"CSV combinado: {ruta}")


if __name__ == "__main__":
    main()
