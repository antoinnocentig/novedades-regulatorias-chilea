# Arquitectura

## Visión general

```
┌──────────────────────────────────────────────────────────────────────┐
│                          FUENTES OFICIALES                            │
│  CKAN Energía Abierta · Repositorio reportes (PDF) · APIs Senado/Cámara │
└───────────────┬───────────────────────────┬──────────────────────────┘
                │                           │
        ┌───────▼────────┐         ┌────────▼─────────┐
        │  EXTRACCIÓN    │         │   (sin red →     │
        │ extract/*.py   │         │   datos SEED)    │
        │ ckan.py        │         └────────┬─────────┘
        └───────┬────────┘                  │
                │  DataFrames crudos        │
        ┌───────▼────────┐                  │
        │ TRANSFORMACIÓN │  normalización   │
        │ transform.py   │  de columnas     │
        └───────┬────────┘                  │
                │  filas normalizadas       │
        ┌───────▼───────────────────────────▼─────────┐
        │                CARGA  load.py                │
        │   replace_table (snapshots) / upsert (incr.) │
        └───────┬──────────────────────────────────────┘
                │
        ┌───────▼────────┐      ┌──────────────┐
        │  BASE DE DATOS │◄────►│   ALERTAS    │ alerts.py
        │ SQLite/Postgres│      │ (deltas)     │
        │ models.py      │      └──────────────┘
        └───────┬────────┘
                │  queries.py (DataFrames)
        ┌───────▼────────────────────────────┐
        │           DASHBOARD                 │
        │  streamlit_app.py + pages/  (Plotly,│
        │  pydeck, exports CSV/XLSX/PDF/PNG)  │
        └─────────────────────────────────────┘
```

El **orquestador** `pipeline.py` ejecuta el ciclo extract→transform→load→alerts
por cada fuente, con caída elegante a `seed.py` cuando no hay datos en vivo, y
registra todo en `etl_run`.

## Componentes

| Capa | Archivo | Responsabilidad |
|------|---------|-----------------|
| Configuración | `config.py`, `config/sources.yaml` | Rutas, `DATABASE_URL`, catálogo de fuentes |
| Modelo | `models.py` | Tablas ORM (SQLAlchemy 2.0) |
| Conexión | `db.py` | Engine + sesiones (SQLite/PostgreSQL) |
| Cliente CKAN | `ckan.py` | API Energía Abierta (búsqueda, DataStore, CSV) |
| Extracción | `extract/energia.py`, `reportes.py`, `legislativo.py` | Datos en vivo |
| Transformación | `transform.py` | Normalización de columnas, fechas, ERNC |
| Carga | `load.py` | `replace_table` / `upsert` |
| Respaldo | `seed.py`, `bootstrap.py` | Datos demo y arranque idempotente |
| Alertas | `alerts.py` | Generación con dedupe por `clave` |
| Lectura | `queries.py` | DataFrames para la app |
| Exportación | `exports.py` | CSV, Excel, PDF, PNG |
| UI | `ui.py`, `streamlit_app.py`, `pages/` | Dashboard |
| Orquestación | `pipeline.py`, `scripts/` | ETL programable |

## Modelo de datos

Tablas de hechos (toda fila con `fuente` + `actualizado_en`):

- `capacidad_instalada` — (fecha, región, tecnología, combustible, empresa,
  potencia_mw, es_ernc)
- `generacion` — (fecha, región, tecnología, empresa, energia_gwh, es_ernc)
- `pmgd` — (nombre, región, comuna, tecnología, potencia_mw, estado, lat, lon)
- `almacenamiento` — (nombre, región, potencia_mw, energia_mwh, estado, propietario)
- `demanda` — (fecha, región, sector, demanda_gwh, demanda_maxima_mw)
- `reportes_cne` — (tipo, periodo, url, ruta_local, hash, tablas_json)
- `proyectos_ley` — (boletín, título, cámara, estado, comisión, urgencia, tema…)

Tablas de soporte:

- `alertas` — (tipo, severidad, título, módulo, clave[dedupe], leída)
- `etl_run` — trazabilidad: (fuente, inicio, fin, estado, filas, modo, mensaje)

**Claves naturales** garantizan idempotencia: los snapshots se reemplazan por
completo; reportes y proyectos se *upsertean* para poder detectar novedades.

## Decisiones de diseño

- **Descubrimiento por texto en CKAN** (no IDs fijos) → resiliencia.
- **Caída a SEED** → el dashboard nunca queda vacío; el modo queda auditado.
- **SQLite → PostgreSQL** con sólo `DATABASE_URL` (SQLAlchemy, sin cambios).
- **Exportación opcional con degradación** → la ausencia de un motor (reportlab/
  kaleido) nunca rompe una página.
- **Caché Streamlit** (`st.cache_data`, TTL) → respuesta rápida; el ETL corre
  fuera de la app.
