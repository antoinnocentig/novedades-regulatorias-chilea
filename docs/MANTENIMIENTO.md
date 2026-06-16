# Plan de mantenimiento

## Rutina

| Frecuencia | Tarea |
|-----------|-------|
| **Diaria** | ETL automático (GitHub Actions/cron). Revisar que la última `etl_run` esté en estado `ok` y modo `live`. |
| **Semanal** | Revisar alertas críticas. Verificar que los reportes CNE más recientes se hayan capturado. |
| **Mensual** | Confirmar que llegó el Reporte Mensual del Sector Energético y el de ERNC del periodo. Revisar nuevos proyectos de ley. |
| **Trimestral** | Actualizar dependencias (`requirements.txt`), revisar cambios en el portal CKAN y en las APIs legislativas. |
| **Anual** | Capturar el Anuario Estadístico. Revisar definiciones (p. ej. umbral ERNC). |

## Monitoreo de salud

```bash
# Última corrida por fuente y su modo (live/seed):
python -c "from electricidad import queries; \
df=queries.etl_runs(); print(df[['fuente','estado','modo','filas','fin']].head(15).to_string())"
```

Señales de atención:
- Modo `seed` persistente en una fuente ⇒ problema de red/credenciales o cambio
  en el portal. Revisar la lista blanca de egress y `config/sources.yaml`.
- `estado = error` ⇒ ver el campo `mensaje` de `etl_run`.

## Cuando una fuente cambia

El acoplamiento está aislado en dos lugares:
1. **`config/sources.yaml`** — términos de búsqueda CKAN, columnas esperadas,
   URLs y regex de reportes. **Ajustar aquí primero** (no requiere tocar código).
2. **`electricidad/extract/*.py`** — sólo si cambia el *formato* (no el nombre)
   de los datos.

Tras un cambio, validar:

```bash
OFFLINE_ONLY=false python scripts/run_etl.py        # debe traer modo 'live'
python -c "from streamlit.testing.v1 import AppTest; import glob; \
[print(s, 'OK' if not AppTest.from_file(s).run().exception else 'ERROR') \
 for s in ['streamlit_app.py']+sorted(glob.glob('pages/*.py'))]"
```

## Base de datos

- **Respaldo** (SQLite): copiar `data/energia.db`. (PostgreSQL): `pg_dump`.
- **Migraciones de esquema**: el proyecto usa `create_all` (idempotente). Para
  cambios de columnas en producción, introducir Alembic.
- **Retención**: los datos históricos se conservan; los snapshots se reemplazan
  por periodo. `etl_run` crece ~1 fila por fuente y corrida (purgar > 1 año si se
  desea).

## Calidad de datos

- Toda fila lleva `fuente` y `actualizado_en` (trazabilidad).
- Las alertas de variación de capacidad usan umbral (`alerts.alertas_capacidad`,
  por defecto 0,5 %). Ajustar según ruido observado.
- Validar visualmente el Resumen Ejecutivo tras cada despliegue.

## Seguridad

- No se almacenan credenciales en el repo; usar `.env`/*secrets*.
- Las APIs consultadas son públicas y de sólo lectura.
- El contenido externo (PDF, XML, comentarios) se trata como no confiable: sólo
  se parsea, nunca se ejecuta.

## Dependencias críticas

| Paquete | Rol | Riesgo si falta |
|---------|-----|-----------------|
| streamlit, plotly, pydeck | UI / mapas | App no arranca |
| SQLAlchemy | BD | App no arranca |
| requests, beautifulsoup4, lxml | Extracción | Sin datos en vivo (cae a seed) |
| pdfplumber | Tablas de PDF | Sin extracción de reportes |
| reportlab, kaleido, xlsxwriter | Export PDF/PNG/Excel | Botón se omite (degradación) |
