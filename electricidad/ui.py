"""Helpers de UI para Streamlit: tema, carga cacheada, KPIs, exportación."""
from __future__ import annotations

import pandas as pd
import streamlit as st

from . import exports, queries
from .bootstrap import asegurar_datos

# Paleta por tecnología (consistente en todo el dashboard).
COLORES = {
    "Solar": "#f4b400", "Eólica": "#34a0a4", "Hidro embalse": "#1d6fb8",
    "Hidro pasada": "#48cae4", "Mini-hidro": "#90e0ef", "Gas": "#e07a5f",
    "Carbón": "#3d405b", "Diésel": "#9a8c98", "Biomasa": "#588157",
    "Geotermia": "#c1121f", "BESS": "#7209b7",
}


def setup(titulo: str, icono: str = "⚡") -> None:
    st.set_page_config(page_title=f"{titulo} · Mercado Eléctrico CL",
                       page_icon=icono, layout="wide")
    asegurar_datos()  # idempotente: crea esquema + siembra si está vacío


def banner_modo() -> None:
    modo = queries.modo_datos()
    actualizado = queries.ultima_actualizacion()
    if modo == "live":
        st.caption(f"🟢 Datos en vivo · última actualización ETL: {actualizado}")
    else:
        st.caption(f"🟡 Datos de respaldo (demo/offline) · ejecuta `python scripts/run_etl.py` "
                   f"con acceso a energiaabierta.cl para datos en vivo · última ETL: {actualizado}")


# ── Carga cacheada (5 min) ───────────────────────────────────────────────────
@st.cache_data(ttl=300, show_spinner=False)
def cap() -> pd.DataFrame: return queries.capacidad()
@st.cache_data(ttl=300, show_spinner=False)
def gen() -> pd.DataFrame: return queries.generacion()
@st.cache_data(ttl=300, show_spinner=False)
def dem() -> pd.DataFrame: return queries.demanda()
@st.cache_data(ttl=300, show_spinner=False)
def pmgd() -> pd.DataFrame: return queries.pmgd()
@st.cache_data(ttl=300, show_spinner=False)
def alm() -> pd.DataFrame: return queries.almacenamiento()
@st.cache_data(ttl=300, show_spinner=False)
def reportes() -> pd.DataFrame: return queries.reportes()
@st.cache_data(ttl=300, show_spinner=False)
def proyectos() -> pd.DataFrame: return queries.proyectos_ley()
@st.cache_data(ttl=120, show_spinner=False)
def alertas() -> pd.DataFrame: return queries.alertas()


def kpi(col, etiqueta: str, valor: str, delta: str | None = None,
        ayuda: str | None = None) -> None:
    col.metric(etiqueta, valor, delta=delta, help=ayuda)


def fmt(n: float, sufijo: str = "", dec: int = 0) -> str:
    return f"{n:,.{dec}f}{sufijo}".replace(",", ".")


def _safe(fn):
    """Genera bytes de exportación; devuelve None si falta el motor opcional."""
    try:
        return fn()
    except Exception:  # reportlab/xlsxwriter/kaleido no instalados, etc.
        return None


def botones_descarga(df: pd.DataFrame, nombre: str, fig=None) -> None:
    """Renderiza botones de descarga CSV/Excel/PDF (+PNG si hay figura).

    Cada formato se omite con elegancia si su motor opcional no está instalado,
    de modo que la página nunca falle por una dependencia de exportación.
    """
    st.markdown("**Exportar**")
    cols = st.columns(4)
    cols[0].download_button("⬇️ CSV", exports.to_csv_bytes(df),
                            file_name=f"{nombre}.csv", mime="text/csv",
                            use_container_width=True)

    xls = _safe(lambda: exports.to_excel_bytes({nombre[:31]: df}))
    if xls:
        cols[1].download_button("⬇️ Excel", xls, file_name=f"{nombre}.xlsx",
                                mime="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                use_container_width=True)

    pdf = _safe(lambda: exports.df_to_pdf_bytes(df, nombre.replace('_', ' ').title()))
    if pdf:
        cols[2].download_button("⬇️ PDF", pdf, file_name=f"{nombre}.pdf",
                                mime="application/pdf", use_container_width=True)

    if fig is not None:
        png = exports.fig_to_png_bytes(fig)
        if png:
            cols[3].download_button("⬇️ PNG", png, file_name=f"{nombre}.png",
                                    mime="image/png", use_container_width=True)


def periodo_label(fecha: str) -> str:
    return fecha[:7] if isinstance(fecha, str) else str(fecha)
