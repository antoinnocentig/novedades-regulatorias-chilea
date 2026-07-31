# Sumas anuales — Colbún

Calcula la suma anual de una columna por cada tabla, filtrando por la empresa
**Colbún**, y genera una **tabla (CSV)** y un **gráfico de barras (PNG)** por año.

| Tabla | Columna sumada | Salida |
|---|---|---|
| `cat02_produccion_genergias.mercados.tb_balance_energia_rpa` | `valorizado` | `balance_energia_valorizado.*` |
| `cat02_produccion_genergias.mercados.tb_balance_precio_estabilizado_rpa` | `diferencia horaria` | `precio_estabilizado_diferencia_horaria.*` |
| `cat02_produccion_genergias.mercados.tb_sobrecosto_scmt_neto_rpa` | `asignación` | `sobrecosto_scmt_asignacion.*` |

Además genera `combinado_por_anio.csv` con las tres series.

## Cómo correr

```bash
pip install -r requirements.txt

export DATABRICKS_SERVER_HOSTNAME="adb-xxxx.azuredatabricks.net"
export DATABRICKS_HTTP_PATH="/sql/1.0/warehouses/xxxxxxxx"
export DATABRICKS_TOKEN="dapiXXXXXXXX"

python colbun_sumas_anuales.py
```

Los CSV y PNG quedan en `salidas/`.

## Detección de columnas

El script **no asume** los nombres exactos de las columnas de año y empresa:
inspecciona el esquema con `DESCRIBE TABLE` y elige la mejor coincidencia
(normalizando acentos y mayúsculas). Considera todos los años presentes en el
registro.

- **Año:** usa una columna entera de año (`anio`, `año`, `year`, …) si existe;
  si no, extrae el año de una columna de fecha con `YEAR(...)`.
- **Empresa:** busca una columna tipo `empresa`, `propietario`, `coordinado`,
  etc. El filtro `LIKE '%COLBUN%'` normaliza acentos, así que captura `Colbún`,
  `COLBÚN`, `Colbun S.A.`, etc.

Si la detección no acierta en alguna tabla, se puede forzar el nombre en la
lista `CONSULTAS` del script mediante los campos `col_empresa`, `col_anio` o
`col_fecha`.

## Otro motor (BigQuery, etc.)

El SQL es estándar salvo `translate(...)` y `YEAR(...)`, soportados también por
BigQuery. Para usar BigQuery basta reemplazar `get_connection()` y `DESCRIBE`
por el cliente correspondiente; la lógica de agregación y de gráficos no cambia.
