# Fuentes de datos y estrategia de extracción

Este documento responde al requisito de **identificar todas las APIs, datasets,
CSV, JSON, PDFs y fuentes oficiales** por visualización, y documentar **cómo se
extrae cada una**. La configuración operativa vive en
[`config/sources.yaml`](../config/sources.yaml).

## Principio general

Energía Abierta (`energiaabierta.cl`) es un portal **CKAN**. CKAN expone una API
REST estándar en `/api/3/action/`. En lugar de depender de IDs de dataset (que
cambian), el sistema **descubre los datos por búsqueda de texto** y descarga los
recursos CSV del DataStore. Así la extracción sobrevive a reorganizaciones del
portal.

Endpoints CKAN utilizados (`electricidad/ckan.py`):

| Acción | Uso |
|--------|-----|
| `package_search?q=<texto>` | Encontrar el dataset de cada visualización |
| `package_show?id=<slug>` | Listar recursos de un dataset |
| `datastore_search?resource_id=<id>` | Leer registros paginados (JSON) |
| `datastore_search_sql?sql=<SQL>` | Consultas SQL sobre el DataStore |
| `…/resource/<id>/download/<archivo>.csv` | Descargar CSV crudo |

> **Nota de entorno:** en redes con egress restringido hay que **incluir
> `energiaabierta.cl` en la lista blanca**. Sin acceso, el pipeline cae a datos
> de respaldo (seed) y lo deja registrado en la tabla `etl_run` (modo `seed`).

---

## Estrategia por visualización / módulo

### 1. Capacidad instalada
- **Visualización:** `…/visualizaciones/capacidad-instalada/` y
  `…/evolucion-de-la-capacidad-instalada/`
- **Extracción:** `package_search` con `capacidad instalada`,
  `potencia instalada SEN`. Se toma el recurso CSV/DataStore y se normalizan las
  columnas (fecha, región, tecnología, combustible, empresa, potencia_MW).
- **Respaldo oficial:** CNE — Reporte Mensual del Sector Energético (PDF).
- **Código:** `electricidad/extract/energia.py::capacidad`.

### 2. Generación eléctrica
- **Visualización:** `…/generacion-de-energia-electrica/`
- **Extracción:** búsqueda `generacion bruta`, `generacion mensual SEN`;
  normalización a (fecha, región, tecnología, energía_GWh).
- **Respaldo:** Coordinador Eléctrico — Generación real del sistema.
- **Código:** `…energia.py::generacion`.

### 3. ERNC
- **Visualización:** `…/generacion-bruta-ernc/`
- **Extracción:** búsqueda `ERNC`, `energias renovables no convencionales`.
  La clasificación ERNC (Solar, Eólica, Mini-hidro ≤20 MW, Biomasa, Geotermia)
  se aplica en `transform.es_ernc`, de modo que también se deriva de los datasets
  de generación/capacidad.

### 4. PMGD
- **Visualización:** `…/pequenos-medios-de-generacion-en-chile/`
- **Extracción:** búsqueda `PMGD`, `pequenos medios de generacion`. Se conservan
  coordenadas (lat/lon) para el **mapa interactivo** (pydeck).
- **Respaldo:** Coordinador Eléctrico — Informe Mensual PMGD (PDF).
- **Código:** `…energia.py::pmgd`.

### 5. Almacenamiento (BESS)
- **Extracción:** búsqueda `almacenamiento BESS`, `sistemas de almacenamiento`.
- **Complemento:** cuando Energía Abierta no publica el dato, se cruza con el
  **SEIA** (`seia.sea.gob.cl`) para proyectos en evaluación/aprobados.
- **Código:** `…energia.py::almacenamiento`.

### 6. Demanda eléctrica
- **Extracción:** búsqueda `demanda electrica`, `consumo energia electrica sector`,
  `demanda maxima sistema`; normalización a (fecha, región, sector, demanda_GWh,
  demanda_máxima_MW).
- **Respaldo:** Coordinador Eléctrico — Demanda real del sistema.

### 7. Reportes CNE  (`…/reportes/`)
- **Extracción:** se descarga el HTML del repositorio, se listan **todos los
  enlaces PDF**, se clasifican por tipo mediante regex
  (`config/sources.yaml → modulos.reportes_cne.tipos`) y se identifica el
  **periodo más reciente** por tipo.
- **Reconstrucción de datos:** el PDF se descarga y sus **tablas se extraen con
  `pdfplumber`**, almacenándose en `reportes_cne.tablas_json` para comparaciones
  mes a mes.
- **Tipos monitoreados:** Reporte Mensual Sector Energético, Reporte Mensual
  ERNC, Reporte Financiero del Sector Energético, Anuario Estadístico.
- **Código:** `electricidad/extract/reportes.py`.

### 8. Proyectos de ley
- **Cámara de Diputadas y Diputados — Open Data (XML):**
  `WSLegislativo.asmx/retornarProyectosLeyXAnno?prmAnno=YYYY`.
- **Senado — WS público de tramitación (XML):**
  `tramitacion.senado.cl/wspublico/tramitacion.php?boletin=NNNN`.
- **Filtro temático:** energía, mercado eléctrico, PMGD, transmisión,
  distribución, almacenamiento, hidrógeno verde, desalinización, permisología
  (`transform`/`legislativo._tema`).
- **Código:** `electricidad/extract/legislativo.py`.

### 9. Alertas
- Derivadas en el pipeline (`electricidad/alerts.py`) a partir de los cambios
  detectados en las cargas anteriores: variación de capacidad (umbral
  configurable), nuevos PMGD, nuevos reportes, nuevos proyectos de ley y
  capacidad de almacenamiento.

---

## Normalización

`electricidad/transform.py` resuelve la heterogeneidad de los datasets:
- `find_column` mapea nombres reales a columnas internas (tolerante a acentos,
  mayúsculas y subcadenas).
- `parse_fecha` convierte `ene-2026`, `2026-01`, `202601`, `enero 2026`, etc. a
  `YYYY-MM-01`.
- `to_float` maneja separadores de miles/decimales chilenos.

Todas las filas guardan la columna **`fuente`** y **`actualizado_en`** para
trazabilidad; cada corrida del pipeline queda en **`etl_run`**.
