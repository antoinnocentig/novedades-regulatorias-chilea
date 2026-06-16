# ── Dashboard Mercado Eléctrico Chileno — imagen Streamlit ──
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Dependencias del sistema para pdfplumber/kaleido/psycopg2.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY electricidad/ ./electricidad/
COPY pages/ ./pages/
COPY config/ ./config/
COPY scripts/ ./scripts/
COPY streamlit_app.py ./

# Inicializa el esquema y siembra datos de respaldo en build.
RUN python scripts/init_db.py

EXPOSE 8501
HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health || exit 1

CMD ["streamlit", "run", "streamlit_app.py", "--server.port=8501", "--server.address=0.0.0.0"]
