# Databricks notebook source
# MAGIC %md
# MAGIC # Colbún · Sumas anuales por columna
# MAGIC
# MAGIC Para cada tabla calcula la **suma anual** filtrando por la empresa **Colbún**
# MAGIC (todos los años que existan en el registro) y muestra una **tabla** y un
# MAGIC **gráfico de barras**.
# MAGIC
# MAGIC | Tabla | Columna sumada |
# MAGIC |---|---|
# MAGIC | `cat02_produccion_genergias.mercados.tb_balance_energia_rpa` | `valorizado` |
# MAGIC | `cat02_produccion_genergias.mercados.tb_balance_precio_estabilizado_rpa` | `diferencia horaria` |
# MAGIC | `cat02_produccion_genergias.mercados.tb_sobrecosto_scmt_neto_rpa` | `asignación` |
# MAGIC
# MAGIC No hace falta configurar conexión: usa el `spark` del clúster. Las columnas de
# MAGIC **año** y **empresa** se detectan solas desde el esquema; si en alguna tabla no
# MAGIC aciertan, se pueden fijar a mano en `CONSULTAS` (`col_empresa`, `col_anio`,
# MAGIC `col_fecha`).

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1) Configuración

# COMMAND ----------

import re
import unicodedata

import matplotlib
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker

EMPRESA = "COLBUN"        # se busca por coincidencia parcial, sin acentos
COLOR = "#2a78d6"         # azul (paleta categórica validada)
COLOR_LABEL = "#0b0b0b"
COLOR_AXIS = "#8a8a86"

# Cada entrada: tabla + columna a sumar + título/archivo. Los campos col_* son
# opcionales: sólo se usan si la autodetección no acierta.
CONSULTAS = [
    {
        "tabla": "cat02_produccion_genergias.mercados.tb_balance_energia_rpa",
        "columna_valor": "valorizado",
        "titulo": "Colbún · Suma anual de «valorizado» — Balance de energía",
        "slug": "balance_energia_valorizado",
        # "col_empresa": None, "col_anio": None, "col_fecha": None,
    },
    {
        "tabla": "cat02_produccion_genergias.mercados.tb_balance_precio_estabilizado_rpa",
        "columna_valor": "diferencia horaria",
        "titulo": "Colbún · Suma anual de «diferencia horaria» — Precio estabilizado",
        "slug": "precio_estabilizado_diferencia_horaria",
    },
    {
        "tabla": "cat02_produccion_genergias.mercados.tb_sobrecosto_scmt_neto_rpa",
        "columna_valor": "asignación",
        "titulo": "Colbún · Suma anual de «asignación» — Sobrecosto SCMT neto",
        "slug": "sobrecosto_scmt_asignacion",
    },
]

# Candidatos de nombre (normalizados, sin acentos) para autodetección.
CANDIDATOS_EMPRESA = [
    "empresa", "nombreempresa", "empresacoordinada", "empresapropietaria",
    "propietario", "coordinado", "razonsocial", "agente", "participante",
    "cliente", "titular", "nombre",
]
CANDIDATOS_ANIO = ["anio", "ano", "agno", "year", "ejercicio"]
CANDIDATOS_FECHA = ["fecha", "fechaoperacion", "fechahora", "date", "periodo", "dia"]

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2) Funciones auxiliares

# COMMAND ----------

def normalizar(texto: str) -> str:
    """minúsculas, sin acentos, sólo alfanumérico -> para comparar nombres."""
    t = unicodedata.normalize("NFKD", texto)
    t = "".join(c for c in t if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", t.lower())


def q(identificador: str) -> str:
    """Cita un identificador con backticks para Spark SQL."""
    return "`" + identificador.replace("`", "``") + "`"


def elegir_columna(cols, candidatos):
    """Mejor coincidencia de `cols` con la lista `candidatos` (por preferencia)."""
    normal = {c: normalizar(c) for c in cols}
    for cand in candidatos:                       # 1) igualdad exacta
        for c in cols:
            if normal[c] == cand:
                return c
    for cand in candidatos:                       # 2) contención
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


def resolver_columnas(consulta, dtypes):
    """Devuelve (col_valor, col_empresa, expr_anio) para una consulta.

    `dtypes` es la lista [(nombre, tipo), ...] de spark.table(...).dtypes
    """
    nombres = [c for c, _ in dtypes]
    tipos = {c: t for c, t in dtypes}

    # --- columna de valor ---
    objetivo = normalizar(consulta["columna_valor"])
    col_valor = next((c for c in nombres if normalizar(c) == objetivo), None)
    if col_valor is None:
        col_valor = elegir_columna(nombres, [objetivo])
    if col_valor is None:
        raise ValueError(
            f"No encontré la columna «{consulta['columna_valor']}» en {consulta['tabla']}.\n"
            f"Columnas: {nombres}"
        )

    # --- columna de empresa ---
    col_empresa = consulta.get("col_empresa") or elegir_columna(nombres, CANDIDATOS_EMPRESA)
    if col_empresa is None:
        raise ValueError(
            f"No encontré columna de empresa en {consulta['tabla']}. "
            f"Define 'col_empresa'. Columnas: {nombres}"
        )

    # --- año: columna explícita o extraído de una fecha ---
    if consulta.get("col_anio"):
        expr_anio = q(consulta["col_anio"])
    elif consulta.get("col_fecha"):
        expr_anio = f"YEAR({q(consulta['col_fecha'])})"
    else:
        col_anio = None
        for cand in CANDIDATOS_ANIO:
            col_anio = next(
                (c for c in nombres if normalizar(c) == cand and es_tipo_entero(tipos[c])),
                None,
            )
            if col_anio:
                break
        if col_anio:
            expr_anio = q(col_anio)
        else:
            col_fecha = None
            for cand in CANDIDATOS_FECHA:
                col_fecha = next(
                    (c for c in nombres if cand in normalizar(c) and es_tipo_fecha(tipos[c])),
                    None,
                )
                if col_fecha:
                    break
            if col_fecha is None:  # cualquier fecha como último recurso
                col_fecha = next((c for c in nombres if es_tipo_fecha(tipos[c])), None)
            if col_fecha is None:
                raise ValueError(
                    f"No encontré columna de año ni de fecha en {consulta['tabla']}. "
                    f"Define 'col_anio' o 'col_fecha'. Columnas: {nombres}"
                )
            expr_anio = f"YEAR({q(col_fecha)})"

    return col_valor, col_empresa, expr_anio


def suma_anual_sql(consulta):
    """Construye el SELECT de suma anual filtrando por Colbún (spark DataFrame)."""
    dtypes = spark.table(consulta["tabla"]).dtypes  # noqa: F821 (spark del clúster)
    col_valor, col_empresa, expr_anio = resolver_columnas(consulta, dtypes)

    empresa_norm = f"translate(upper({q(col_empresa)}), 'ÁÉÍÓÚÜÑ', 'AEIOUUN')"
    sql_txt = (
        f"SELECT {expr_anio} AS anio, "
        f"SUM(CAST({q(col_valor)} AS DOUBLE)) AS total\n"
        f"FROM {consulta['tabla']}\n"
        f"WHERE {empresa_norm} LIKE '%{EMPRESA}%'\n"
        f"  AND {expr_anio} IS NOT NULL\n"
        f"GROUP BY {expr_anio}\n"
        f"ORDER BY anio"
    )
    print(f"[{consulta['slug']}] valor={col_valor!r}  empresa={col_empresa!r}  anio={expr_anio}")
    return spark.sql(sql_txt), sql_txt  # noqa: F821


def _mostrar(fig):
    """display() en Databricks; plt.show() fuera de Databricks."""
    try:
        display(fig)  # noqa: F821 (builtin de Databricks)
    except NameError:
        plt.show()
    plt.close(fig)


def _fmt(v):
    a = abs(v)
    if a >= 1e9:
        return f"{v/1e9:.1f} B"
    if a >= 1e6:
        return f"{v/1e6:.1f} M"
    if a >= 1e3:
        return f"{v/1e3:.1f} k"
    return f"{v:,.0f}"


def grafico_barras(pdf, titulo):
    """Gráfico de barras (un año por barra) a partir de un pandas DataFrame."""
    fig, ax = plt.subplots(figsize=(9, 5), dpi=120)
    anios = pdf["anio"].astype(int).astype(str).tolist()
    totales = pdf["total"].tolist()

    barras = ax.bar(anios, totales, color=COLOR, width=0.62, zorder=3)
    for barra, val in zip(barras, totales):
        ax.annotate(
            _fmt(val),
            (barra.get_x() + barra.get_width() / 2, barra.get_height()),
            xytext=(0, 4), textcoords="offset points",
            ha="center", va="bottom", fontsize=9, color=COLOR_LABEL,
        )

    ax.set_title(titulo, fontsize=12, color=COLOR_LABEL, loc="left", pad=12)
    ax.margins(y=0.15)
    ax.grid(axis="y", color=COLOR_AXIS, alpha=0.25, linewidth=0.8, zorder=0)
    for lado in ("top", "right", "left"):
        ax.spines[lado].set_visible(False)
    ax.spines["bottom"].set_color(COLOR_AXIS)
    ax.tick_params(colors=COLOR_AXIS, labelcolor=COLOR_LABEL, length=0)
    ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: _fmt(x)))
    fig.tight_layout()
    return fig

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3) Cálculo, tabla y gráfico por tabla

# COMMAND ----------

series = {}  # slug -> pandas DataFrame [anio, total]

for consulta in CONSULTAS:
    print("=" * 70)
    try:
        sdf, _sql = suma_anual_sql(consulta)
    except Exception as e:  # noqa: BLE001
        print(f"[ERROR] {consulta['slug']}: {e}")
        continue

    pdf = sdf.toPandas()
    if pdf.empty:
        print(f"[{consulta['slug']}] sin registros para Colbún.")
        continue

    pdf["anio"] = pdf["anio"].astype(int)
    pdf = pdf.sort_values("anio").reset_index(drop=True)
    series[consulta["slug"]] = pdf

    print(f"\nTabla · {consulta['titulo']}")
    display(sdf.orderBy("anio"))          # noqa: F821 (tabla interactiva Databricks)
    _mostrar(grafico_barras(pdf, consulta["titulo"]))

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4) Tabla combinada (las tres series por año)

# COMMAND ----------

import pandas as pd

if series:
    combinado = pd.concat(
        [df.set_index("anio")["total"].rename(slug) for slug, df in series.items()],
        axis=1,
    ).sort_index()
    combinado.index.name = "anio"
    display(combinado.reset_index())      # noqa: F821
else:
    print("No hubo resultados para combinar.")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 5) Diagnóstico — ¿por qué sale negativo?
# MAGIC
# MAGIC Un negativo puede venir de **(a)** columna de valor mal detectada, **(b)** un
# MAGIC saldo que legítimamente es negativo, o **(c)** números en formato chileno
# MAGIC (`-1.234.567,89`) guardados como texto que el `CAST AS DOUBLE` parsea mal.
# MAGIC Esta celda revela cuál es el caso. Cambia `IDX` para diagnosticar otra tabla.

# COMMAND ----------

IDX = 0                       # 0 = balance_energia / valorizado
ANIO_FOCO = 2019              # año a inspeccionar en detalle
consulta = CONSULTAS[IDX]
tabla = consulta["tabla"]

sdf_tabla = spark.table(tabla)                                    # noqa: F821
dtypes = sdf_tabla.dtypes
col_valor, col_empresa, expr_anio = resolver_columnas(consulta, dtypes)

print(f"Tabla: {tabla}")
print(f"Detectado -> valor={col_valor!r}  empresa={col_empresa!r}  anio={expr_anio}\n")

# (a) ¿hay varias columnas candidatas a 'valorizado'? ¿de qué tipo es la elegida?
objetivo = normalizar(consulta["columna_valor"])
candidatas = [(c, t) for c, t in dtypes if objetivo[:6] in normalizar(c)]
tipo_valor = dict(dtypes)[col_valor]
print(f"Columnas que se parecen a «{consulta['columna_valor']}»: {candidatas}")
print(f"Tipo de la columna elegida ({col_valor!r}): {tipo_valor}")
print("Todas las columnas:", [c for c, _ in dtypes], "\n")

# (b) confirmar a quién se está filtrando
empresa_norm = f"translate(upper({q(col_empresa)}), 'ÁÉÍÓÚÜÑ', 'AEIOUUN')"
print("Valores de empresa que capta el filtro '%COLBUN%':")
display(spark.sql(                                                # noqa: F821
    f"SELECT DISTINCT {q(col_empresa)} AS empresa FROM {tabla} "
    f"WHERE {empresa_norm} LIKE '%{EMPRESA}%' ORDER BY empresa"
))

# (c) desglose por año: total, filas, min, max, y positivos/negativos por separado
print("\nDesglose por año (si suma_negativos aporta casi todo el total, el dato "
      "trae signo; si min es muy raro, revisa el CAST/formato):")
display(spark.sql(f"""
    SELECT {expr_anio} AS anio,
           COUNT(*)                                             AS filas,
           SUM(CAST({q(col_valor)} AS DOUBLE))                  AS total,
           SUM(CASE WHEN CAST({q(col_valor)} AS DOUBLE) > 0
                    THEN CAST({q(col_valor)} AS DOUBLE) END)    AS suma_positivos,
           SUM(CASE WHEN CAST({q(col_valor)} AS DOUBLE) < 0
                    THEN CAST({q(col_valor)} AS DOUBLE) END)    AS suma_negativos,
           MIN(CAST({q(col_valor)} AS DOUBLE))                  AS minimo,
           MAX(CAST({q(col_valor)} AS DOUBLE))                  AS maximo,
           SUM(CASE WHEN {q(col_valor)} IS NOT NULL
                     AND CAST({q(col_valor)} AS DOUBLE) IS NULL
                    THEN 1 ELSE 0 END)                          AS cast_fallidos
    FROM {tabla}
    WHERE {empresa_norm} LIKE '%{EMPRESA}%'
    GROUP BY {expr_anio}
    ORDER BY anio
"""))

# muestra de filas crudas del año en foco (valor original SIN cast)
print(f"\nFilas crudas de Colbún en {ANIO_FOCO} (valor original, sin CAST):")
display(spark.sql(                                               # noqa: F821
    f"SELECT {q(col_empresa)} AS empresa, {expr_anio} AS anio, "
    f"{q(col_valor)} AS valor_original "
    f"FROM {tabla} "
    f"WHERE {empresa_norm} LIKE '%{EMPRESA}%' AND {expr_anio} = {ANIO_FOCO} "
    f"LIMIT 50"
))
