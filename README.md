# ⚡ Dashboard Inteligente del Mercado Eléctrico Chileno

Aplicación web que **consolida automáticamente** información estratégica del
mercado eléctrico chileno desde [Energía Abierta (CNE)](http://energiaabierta.cl),
reportes oficiales y la tramitación legislativa del Congreso Nacional, y la
presenta en un dashboard interactivo construido con **Streamlit**.

No es un informe: es una **solución permanente y actualizable** que se refresca
sola mediante un pipeline ETL programado (diario).

> **Dato clave:** el sistema obtiene los **datos subyacentes** (CSV/JSON/API
> CKAN, XML legislativo, tablas de PDF) — nunca imágenes de gráficos. Cuando no
> hay acceso de red a las fuentes oficiales, el dashboard se siembra con datos
> de respaldo verificados para no quedar nunca vacío.

---

## Módulos

| # | Módulo | Contenido |
|---|--------|-----------|
| 1 | **Resumen Ejecutivo** | KPIs: capacidad SEN, generación, ERNC, PMGD, almacenamiento, demanda, variación mensual/anual |
| 2 | **Capacidad Instalada** | Evolución histórica, por tecnología/región/empresa/combustible, nuevos proyectos. Filtros |
| 3 | **Generación Eléctrica** | Mensual/anual, por tecnología/región, indicadores hidro/solar/eólica/gas/carbón/diésel/biomasa/geotermia |
| 4 | **ERNC** | Participación, evolución, generación, capacidad, ranking de tecnologías |
| 5 | **PMGD** | Mapa interactivo, operación/construcción, por región/tecnología/potencia, exportable |
| 6 | **Almacenamiento (BESS)** | Potencia/energía, proyectos en construcción/aprobados/evaluación |
| 7 | **Demanda Eléctrica** | Mensual, máxima, curvas históricas, variación anual y por sector, heatmap |
| 8 | **Reportes CNE** | Identifica y descarga el reporte más reciente, extrae tablas, compara mes a mes |
| 9 | **Proyectos de Ley** | Monitoreo Senado/Cámara/BCN por tema (energía, PMGD, H₂ verde, transmisión…) |
| 10 | **Alertas** | Avisos automáticos ante cambios de capacidad, nuevos PMGD, reportes, proyectos, BESS |

Visualizaciones: KPI cards, series de tiempo, mapas, heatmaps, barras apiladas,
treemaps, pie/donut y tablas dinámicas. Exportación a **CSV, Excel, PDF y PNG**.

---

## Arranque rápido (local)

```bash
# 1. Dependencias (recomendado: entorno virtual)
python -m pip install -r requirements.txt

# 2. Inicializar la base de datos (crea esquema y siembra datos de respaldo)
python scripts/init_db.py

# 3. (Opcional) Poblar con datos EN VIVO desde las fuentes oficiales
python scripts/run_etl.py

# 4. Lanzar el dashboard
streamlit run streamlit_app.py
```

Abre <http://localhost:8501>. El dashboard funciona **de inmediato** con datos
de respaldo; el ETL los reemplaza por datos en vivo cuando hay acceso a
`energiaabierta.cl` y a las APIs legislativas.

### Con Docker

```bash
docker compose up --build      # Dashboard + PostgreSQL + ETL inicial
# Dashboard en http://localhost:8501
```

---

## Arquitectura (resumen)

```
Fuentes oficiales ──► Extracción ──► Transformación ──► Carga ──► BD ──► Dashboard
(CKAN, PDF, XML)      (electricidad/   (normalización)   (upsert/  (SQLite/  (Streamlit
                       extract/)                          replace)  Postgres) + Plotly)
                          │                                  │
                          └────────► Alertas ◄───────────────┘
```

- **Extracción** resiliente: descubre datasets CKAN por búsqueda de texto
  (no por ID fijo), pagina el DataStore y descarga CSV; scrapea el repositorio
  de reportes y extrae tablas de PDF; consulta las APIs XML del Senado y la
  Cámara.
- **Base de datos**: SQLite por defecto, **PostgreSQL** con sólo definir
  `DATABASE_URL`. Toda fila conserva `fuente` y `actualizado_en` (trazabilidad);
  la tabla `etl_run` registra cada ejecución.
- **Actualización automática**: GitHub Actions diario (`.github/workflows/etl-diario.yml`),
  o cron/Docker en servidor propio.

Detalle completo en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) y la estrategia
de extracción por visualización en [`docs/FUENTES_DE_DATOS.md`](docs/FUENTES_DE_DATOS.md).

---

## Estructura del proyecto

```
streamlit_app.py            # Entrypoint — Resumen Ejecutivo
pages/                      # 9 páginas del dashboard (navegación lateral)
electricidad/               # Paquete de datos
  ├─ config.py  db.py  models.py      # Configuración y modelo de datos
  ├─ ckan.py                          # Cliente API CKAN Energía Abierta
  ├─ extract/                         # Extractores en vivo
  │   ├─ energia.py  reportes.py  legislativo.py
  ├─ transform.py  load.py            # Normalización y carga
  ├─ pipeline.py                      # Orquestador ETL
  ├─ seed.py  bootstrap.py            # Datos de respaldo
  ├─ alerts.py  queries.py  exports.py  ui.py
config/sources.yaml         # Catálogo de fuentes y estrategia de extracción
scripts/                    # init_db.py, run_etl.py
docs/                       # Manuales (instalación, actualización, mantenimiento)
.github/workflows/          # ETL diario programado
Dockerfile · docker-compose.yml
```

## Despliegue

Preparado para **Streamlit Community Cloud**, **Docker**, **Azure** (App Service
o Container Apps + Azure Functions/Database for PostgreSQL) y **servidor propio**.
Ver [`docs/INSTALACION.md`](docs/INSTALACION.md).

## Manuales

- [Instalación](docs/INSTALACION.md) · [Actualización](docs/ACTUALIZACION.md) ·
  [Mantenimiento](docs/MANTENIMIENTO.md) · [Arquitectura](docs/ARQUITECTURA.md) ·
  [Fuentes de datos](docs/FUENTES_DE_DATOS.md) · [Power BI](docs/POWERBI.md)

> **Power BI:** además del dashboard Streamlit, los mismos datos se consumen en
> Power BI. Para **datos en vivo** conecta Power BI directo a la API de Energía
> Abierta ([`docs/POWERBI_DIRECTO.md`](docs/POWERBI_DIRECTO.md)); o usa el export
> del ETL `python scripts/export_powerbi.py` / PostgreSQL ([`docs/POWERBI.md`](docs/POWERBI.md)).

---

> ℹ️ El directorio `src/` contiene una implementación previa en Next.js (CEN
> Dashboard) que se conserva como referencia. La solución vigente es la app
> Streamlit descrita aquí.
