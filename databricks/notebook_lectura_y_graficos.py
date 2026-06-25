# Databricks notebook source
# MAGIC %md
# MAGIC # Lectura de datos desde Unity Catalog + Gráficos + Preparación para Power BI
# MAGIC
# MAGIC Este notebook hace 4 cosas:
# MAGIC 1. **Conecta** a una tabla que vive dentro de Databricks (Unity Catalog).
# MAGIC 2. **Lee y explora** los datos.
# MAGIC 3. **Crea gráficos** para revisarlos dentro de Databricks.
# MAGIC 4. **Deja una tabla limpia/agregada** lista para que Power BI la consuma.
# MAGIC
# MAGIC > Cada celda está comentada. Donde veas `<<< CAMBIA ESTO >>>` debes reemplazar el valor por el tuyo.

# COMMAND ----------

# MAGIC %md
# MAGIC ## 1. Parámetros (lo único que normalmente tienes que cambiar)
# MAGIC
# MAGIC En Databricks, los datos se organizan en 3 niveles:
# MAGIC
# MAGIC `catalogo.esquema.tabla`
# MAGIC
# MAGIC - **catalogo (catalog):** el contenedor más grande (ej: `main`, `produccion`, `hive_metastore`).
# MAGIC - **esquema (schema / database):** la "base de datos" dentro del catálogo (ej: `ventas`, `energia`).
# MAGIC - **tabla (table):** la tabla concreta con tus datos (ej: `generacion_diaria`).

# COMMAND ----------

# Estos son "widgets": cajas de texto que aparecen arriba del notebook
# para que puedas cambiar los valores sin tocar el código.
dbutils.widgets.text("catalogo", "main", "Catálogo")           # <<< CAMBIA ESTO
dbutils.widgets.text("esquema", "energia", "Esquema/Database") # <<< CAMBIA ESTO
dbutils.widgets.text("tabla", "generacion_diaria", "Tabla")    # <<< CAMBIA ESTO

# Leemos lo que escribiste en los widgets y lo guardamos en variables de Python.
catalogo = dbutils.widgets.get("catalogo")
esquema  = dbutils.widgets.get("esquema")
tabla    = dbutils.widgets.get("tabla")

# Construimos el nombre completo de la tabla: catalogo.esquema.tabla
tabla_completa = f"{catalogo}.{esquema}.{tabla}"
print(f"Voy a leer desde: {tabla_completa}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 2. Leer los datos del catálogo
# MAGIC
# MAGIC `spark` es el motor de Databricks que ya viene cargado en cualquier notebook
# MAGIC (no tienes que importarlo ni crearlo). Lo usamos para leer la tabla.

# COMMAND ----------

# Opción A: leer la tabla completa (la forma más simple).
df = spark.table(tabla_completa)

# Opción B (alternativa): si solo quieres ciertas columnas o filtrar filas,
# usa SQL directamente. Descomenta y ajusta si lo necesitas:
#
# df = spark.sql(f"""
#     SELECT fecha, region, tecnologia, energia_mwh
#     FROM {tabla_completa}
#     WHERE fecha >= '2024-01-01'
# """)

# Mostramos las primeras filas para confirmar que se leyó bien.
display(df.limit(20))

# COMMAND ----------

# MAGIC %md
# MAGIC ## 3. Explorar / entender los datos
# MAGIC
# MAGIC Antes de graficar conviene saber qué columnas hay, sus tipos y cuántas filas tenemos.

# COMMAND ----------

# Esquema = nombres y tipos de cada columna (texto, número, fecha, etc.).
df.printSchema()

# Número total de filas.
print(f"Total de filas: {df.count():,}")

# Estadísticas rápidas (promedio, mínimo, máximo...) de las columnas numéricas.
display(df.describe())

# COMMAND ----------

# MAGIC %md
# MAGIC ## 4. Transformar / agregar los datos
# MAGIC
# MAGIC Los gráficos casi siempre se hacen sobre datos **agrupados** (ej: total por mes,
# MAGIC promedio por región). Aquí preparamos esa versión resumida.
# MAGIC
# MAGIC > ⚠️ Cambia los nombres de columna (`fecha`, `region`, `energia_mwh`) por los reales de TU tabla.

# COMMAND ----------

from pyspark.sql import functions as F  # funciones para agrupar, sumar, contar, etc.

# Ejemplo 1: suma de una métrica agrupada por una categoría.
# (Ej: total de energía generada por región)
df_por_categoria = (
    df.groupBy("region")                          # <<< CAMBIA: columna categórica
      .agg(F.sum("energia_mwh").alias("total_mwh"))# <<< CAMBIA: columna numérica
      .orderBy(F.desc("total_mwh"))               # ordenamos de mayor a menor
)
display(df_por_categoria)

# COMMAND ----------

# Ejemplo 2: evolución en el tiempo (serie temporal).
# Agrupamos por mes para ver la tendencia.
df_en_el_tiempo = (
    df.withColumn("mes", F.date_trunc("month", F.col("fecha")))  # <<< CAMBIA: columna de fecha
      .groupBy("mes")
      .agg(F.sum("energia_mwh").alias("total_mwh"))              # <<< CAMBIA: columna numérica
      .orderBy("mes")
)
display(df_en_el_tiempo)

# COMMAND ----------

# MAGIC %md
# MAGIC ## 5. Crear gráficos DENTRO de Databricks
# MAGIC
# MAGIC Hay dos caminos:
# MAGIC
# MAGIC ### Camino fácil (recomendado): el botón de gráfico de `display()`
# MAGIC Cuando ejecutas `display(...)`, debajo de la tabla aparece un ícono de **gráfico (+)**.
# MAGIC Haz clic ahí, elige *Bar*, *Line*, *Pie*, etc., y configuras los ejes con el mouse.
# MAGIC No necesitas escribir código para esto.
# MAGIC
# MAGIC ### Camino con código: matplotlib
# MAGIC Útil si quieres gráficos reproducibles o exportarlos como imagen.

# COMMAND ----------

import matplotlib.pyplot as plt

# Para graficar con matplotlib pasamos los datos de Spark a Pandas.
# (Pandas trabaja en memoria, así que hazlo SOLO sobre datos ya agregados/pequeños,
#  nunca sobre la tabla completa de millones de filas.)
pdf = df_por_categoria.toPandas()

# Gráfico de barras
plt.figure(figsize=(10, 5))                  # tamaño del gráfico (ancho, alto en pulgadas)
plt.bar(pdf["region"], pdf["total_mwh"])     # eje X = categoría, eje Y = valor
plt.title("Total de energía por región")     # título
plt.xlabel("Región")                          # etiqueta eje X
plt.ylabel("Total MWh")                        # etiqueta eje Y
plt.xticks(rotation=45, ha="right")          # rotar etiquetas para que no se encimen
plt.tight_layout()                            # ajustar márgenes
plt.show()                                    # mostrar en el notebook

# COMMAND ----------

# Gráfico de línea (serie temporal)
pdf_tiempo = df_en_el_tiempo.toPandas()

plt.figure(figsize=(10, 5))
plt.plot(pdf_tiempo["mes"], pdf_tiempo["total_mwh"], marker="o")
plt.title("Evolución mensual de energía")
plt.xlabel("Mes")
plt.ylabel("Total MWh")
plt.grid(True, alpha=0.3)
plt.tight_layout()
plt.show()

# COMMAND ----------

# MAGIC %md
# MAGIC ## 6. Guardar una tabla lista para Power BI
# MAGIC
# MAGIC **Importante:** Power BI NO lee los gráficos de matplotlib. Lo que Power BI lee
# MAGIC son **tablas** (los datos). Por eso aquí guardamos los datos ya limpios/agregados
# MAGIC como una tabla en el catálogo. Power BI se conectará a esa tabla y harás los
# MAGIC gráficos allá (que es lo correcto: en Power BI los gráficos son interactivos).
# MAGIC
# MAGIC Guardamos como tabla Delta (formato nativo y recomendado en Databricks).

# COMMAND ----------

# Esquema/tabla de destino donde dejaremos el resultado para Power BI.
tabla_powerbi = f"{catalogo}.{esquema}.reporte_powerbi"  # <<< CAMBIA EL NOMBRE si quieres

# Guardamos el resumen "por categoría". Cambia df_por_categoria por el DataFrame
# que quieras exponer (o únelos en uno solo si necesitas varias métricas).
(df_por_categoria
    .write
    .mode("overwrite")        # "overwrite" = reemplaza la tabla cada vez que corres el notebook
    .format("delta")          # formato Delta (el estándar de Databricks)
    .saveAsTable(tabla_powerbi)
)

print(f"Tabla lista para Power BI: {tabla_powerbi}")

# COMMAND ----------

# MAGIC %md
# MAGIC ## 7. Conectar Power BI a esta tabla
# MAGIC
# MAGIC Ya en **Power BI Desktop**:
# MAGIC
# MAGIC 1. **Inicio → Obtener datos → Azure Databricks** (o busca "Databricks").
# MAGIC 2. Te pedirá dos datos que sacas de tu clúster/SQL Warehouse en Databricks
# MAGIC    (menú **Compute → tu SQL Warehouse → Connection details**):
# MAGIC    - **Server Hostname** (ej: `adb-1234567890.1.azuredatabricks.net`)
# MAGIC    - **HTTP Path** (ej: `/sql/1.0/warehouses/abc123...`)
# MAGIC 3. Inicia sesión (normalmente con tu cuenta organizacional / Azure AD,
# MAGIC    o con un *Personal Access Token* si tu empresa lo usa).
# MAGIC 4. En el navegador de tablas, elige `catalogo > esquema > reporte_powerbi`.
# MAGIC 5. Elige el modo:
# MAGIC    - **Import:** copia los datos a Power BI (rápido para reportes; ideal si la tabla ya está agregada).
# MAGIC    - **DirectQuery:** consulta en vivo a Databricks (para datos que cambian seguido o muy grandes).
# MAGIC 6. **Carga** y construye tus gráficos en Power BI arrastrando campos.
# MAGIC
# MAGIC ✅ Recomendación: deja en esta tabla solo lo que el reporte necesita (ya agregado),
# MAGIC así Power BI va más rápido y el reporte es más simple de mantener.
