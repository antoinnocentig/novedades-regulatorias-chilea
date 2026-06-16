# Manual de actualización

El sistema se mantiene al día ejecutando el **pipeline ETL**. Frecuencia
recomendada: **diaria**.

## Ejecución manual

```bash
python scripts/run_etl.py
```

Imprime un resumen JSON (capacidad del último mes, alertas generadas, reportes,
proyectos de ley, proyectos de almacenamiento) y registra la corrida en la tabla
`etl_run`.

## Automatización

### Opción 1 — GitHub Actions (recomendada, incluida)

`.github/workflows/etl-diario.yml` corre todos los días a las 09:00 UTC.
- Si defines el *secret* `DATABASE_URL` (PostgreSQL gestionado), escribe ahí.
- Si no, persiste el `data/energia.db` resultante como artefacto y lo commitea.
- Se puede lanzar a mano con **Run workflow** (`workflow_dispatch`).

### Opción 2 — Cron (servidor propio)

```cron
# Diario a las 05:00 hora de Chile
0 5 * * *  cd /ruta/proyecto && /ruta/.venv/bin/python scripts/run_etl.py >> logs/etl.log 2>&1
```

### Opción 3 — Docker

```bash
docker compose run --rm etl          # ejecución puntual
# o programar esa línea con el cron del host
```

### Opción 4 — Azure

Timer Trigger (Azure Functions) o Container Apps Job que ejecute
`python scripts/run_etl.py` con `DATABASE_URL` configurado.

## Qué hace cada actualización

1. **Extrae en vivo** de Energía Abierta (CKAN), reportes CNE y APIs
   legislativas. Si una fuente falla, usa datos de respaldo (queda en `etl_run`
   con modo `seed`).
2. **Refresca** los snapshots (capacidad, generación, demanda, PMGD,
   almacenamiento) y **upsertea** reportes y proyectos de ley.
3. **Detecta el reporte más reciente** del repositorio CNE y, si hay acceso,
   descarga el PDF y extrae sus tablas.
4. **Genera alertas** por cambios (capacidad, nuevos PMGD/reportes/proyectos,
   almacenamiento).

## Comprobar el estado

- En el dashboard: pie de página *"Datos en vivo / de respaldo"* y, en el
  Resumen Ejecutivo, el expander **"Fuentes y trazabilidad"** muestra `etl_run`.
- Por consola:

```bash
python -c "from electricidad import queries; print(queries.etl_runs().head(10).to_string())"
```

## Forzar datos de respaldo (demo / sin red)

```bash
OFFLINE_ONLY=true python scripts/run_etl.py
```
