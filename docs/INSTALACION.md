# Manual de instalación

## Requisitos

- Python 3.11+
- (Opcional) PostgreSQL 14+ para producción
- (Opcional) Docker / Docker Compose
- **Acceso de red** a `energiaabierta.cl`, `tramitacion.senado.cl`,
  `opendata.camara.cl` para datos en vivo (en redes con egress restringido,
  añádelos a la lista blanca; sin ellos el sistema usa datos de respaldo).

## A. Instalación local

```bash
git clone <repo> && cd novedades-regulatorias-chile
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

python scripts/init_db.py     # crea esquema + datos de respaldo
python scripts/run_etl.py     # (opcional) datos en vivo
streamlit run streamlit_app.py
```

Dashboard en <http://localhost:8501>.

### Variables de entorno (`.env`, ver `.env.example`)

| Variable | Por defecto | Descripción |
|----------|-------------|-------------|
| `DATABASE_URL` | SQLite en `data/energia.db` | Conexión SQLAlchemy |
| `OFFLINE_ONLY` | `false` | Fuerza datos de respaldo (sin red) |
| `AUTO_SEED` | `true` | Siembra cuando no hay datos en vivo |

## B. PostgreSQL

```bash
createdb energia
export DATABASE_URL="postgresql+psycopg2://usuario:clave@localhost:5432/energia"
python scripts/init_db.py && python scripts/run_etl.py
streamlit run streamlit_app.py
```

## C. Docker

```bash
docker compose up --build
```

Levanta PostgreSQL persistente, ejecuta el ETL inicial y publica el dashboard en
el puerto 8501. Para sólo la imagen del dashboard (SQLite interno):

```bash
docker build -t energia-dashboard .
docker run -p 8501:8501 energia-dashboard
```

## D. Streamlit Community Cloud

1. Sube el repositorio a GitHub.
2. En <https://share.streamlit.io> crea una app apuntando a `streamlit_app.py`.
3. (Opcional) define `DATABASE_URL` en *Secrets* para usar PostgreSQL gestionado.
4. El primer arranque siembra datos de respaldo automáticamente.

## E. Azure

- **Azure Container Apps / App Service**: desplegar el `Dockerfile`.
- **Azure Database for PostgreSQL**: definir `DATABASE_URL`.
- **Azure Functions (Timer Trigger)** o **Container Apps Job**: ejecutar
  `python scripts/run_etl.py` diariamente (equivalente al workflow de GitHub).

## Verificación

```bash
# La base responde y tiene datos:
python -c "from electricidad import queries; print('filas capacidad:', len(queries.capacidad()))"
# Las páginas cargan sin excepción (requiere streamlit instalado):
python -c "from streamlit.testing.v1 import AppTest; \
print('home OK' if not AppTest.from_file('streamlit_app.py').run().exception else 'ERROR')"
```
