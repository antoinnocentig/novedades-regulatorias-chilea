# Consumo en Power BI

Power BI no "embebe" el dashboard de Streamlit (son tecnologías distintas), pero
**consume los mismos datos**. El proyecto genera salidas listas para Power BI con:

```bash
python scripts/export_powerbi.py            # crea ./powerbi_export/
```

Esto produce, en `powerbi_export/`:
- un **CSV por tabla** (`capacidad_instalada.csv`, `generacion.csv`, `pmgd.csv`…),
- un **Excel multi-hoja** `mercado_electrico.xlsx` (todas las tablas),
- `diccionario_datos.csv` (tablas, columnas y tipos).

Elige **uno** de los siguientes métodos de conexión.

---

## Método 1 — Excel (el más rápido para empezar)

1. Power BI Desktop → **Obtener datos → Excel** → `mercado_electrico.xlsx`.
2. En el Navegador, marca las hojas que quieras (capacidad, generación, pmgd…).
3. **Cargar**. Listo para construir visualizaciones.

## Método 2 — Carpeta de CSV (recomendado para histórico)

1. **Obtener datos → Carpeta** → selecciona `powerbi_export/`.
2. Mejor: **Obtener datos → Texto/CSV** archivo por archivo para controlar tipos.
3. Power BI detecta los tipos; revisa que `fecha` quede como fecha y `potencia_mw`
   / `energia_gwh` como número decimal.

## Método 3 — PostgreSQL en vivo (recomendado para producción)

Si despliegas el ETL contra PostgreSQL (`DATABASE_URL`), Power BI lee la BD
directamente y se refresca solo:

1. **Obtener datos → Base de datos PostgreSQL**.
2. Servidor: `tu-host:5432` · Base de datos: `energia`.
3. Selecciona las tablas (`capacidad_instalada`, `generacion`, `pmgd`, …).
4. Programa **Actualización** en Power BI Service para que siga al ETL diario.

Plantilla de conexión rápida (`mercado_electrico.pbids`, edita el host):

```json
{
  "version": "0.1",
  "connections": [
    {
      "details": {
        "protocol": "postgresql",
        "address": { "server": "TU_HOST:5432", "database": "energia" }
      },
      "mode": "Import"
    }
  ]
}
```

Haz doble clic en el `.pbids` para abrir Power BI con el origen preconfigurado.

## Método 4 — Script de Python (ETL dentro de Power BI)

Para que Power BI ejecute la extracción él mismo:

1. **Obtener datos → Script de Python**.
2. Pega:

```python
import sys; sys.path.insert(0, r"C:\ruta\al\repo")
from electricidad import queries
from electricidad.bootstrap import asegurar_datos
asegurar_datos()
capacidad      = queries.capacidad()
generacion     = queries.generacion()
demanda        = queries.demanda()
pmgd           = queries.pmgd()
almacenamiento = queries.almacenamiento()
proyectos_ley  = queries.proyectos_ley()
```

3. Power BI ofrecerá cada DataFrame (`capacidad`, `generacion`, …) como tabla.

> Requiere Python instalado y `pip install -r requirements.txt` en la máquina
> donde corre Power BI Desktop / Gateway.

---

## Modelo de datos sugerido en Power BI

- **Tabla calendario**: crea una con DAX `Calendario = CALENDAR(DATE(2018,1,1), TODAY())`
  y relaciónala con `fecha` de capacidad/generación/demanda.
- **Relaciones**: `region` actúa como dimensión común entre capacidad, generación,
  PMGD y almacenamiento.
- **Medidas DAX** útiles:
  ```DAX
  Capacidad Total MW = SUM(capacidad_instalada[potencia_mw])
  Generación GWh     = SUM(generacion[energia_gwh])
  % ERNC = DIVIDE(
      CALCULATE([Generación GWh], generacion[es_ernc] = TRUE()),
      [Generación GWh])
  ```
- **Mapa**: usa `pmgd[lat]` / `pmgd[lon]` en una visualización de Mapa, tamaño =
  `potencia_mw`, leyenda = `estado`.

## Mantener Power BI actualizado

1. El ETL diario refresca la BD/CSV (ver `docs/ACTUALIZACION.md`).
2. Si usas CSV/Excel: reejecuta `python scripts/export_powerbi.py` (puede ir en el
   mismo cron, justo después del ETL).
3. Si usas PostgreSQL: programa la actualización en Power BI Service.
