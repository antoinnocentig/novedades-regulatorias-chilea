"""Módulo 9 — Proyectos de Ley (monitoreo legislativo)."""
from __future__ import annotations

import plotly.express as px

import streamlit as st
from electricidad import ui

ui.setup("Proyectos de Ley", "🏛️")
st.title("🏛️ Proyectos de Ley — Sector Energético")
ui.banner_modo()
st.markdown(
    "Monitoreo del **Senado**, la **Cámara de Diputadas y Diputados** y la **BCN**, "
    "filtrado por temas: energía, mercado eléctrico, PMGD, transmisión, distribución, "
    "almacenamiento, hidrógeno verde, desalinización y permisología."
)

df = ui.proyectos()
if df.empty:
    st.warning("Sin proyectos registrados."); st.stop()

with st.sidebar:
    st.header("Filtros")
    temas = st.multiselect("Tema", sorted(df.tema.unique()))
    estados = st.multiselect("Estado", sorted(df.estado.unique()))
    camaras = st.multiselect("Cámara de origen", sorted(df.camara_origen.unique()))

f = df.copy()
if temas: f = f[f.tema.isin(temas)]
if estados: f = f[f.estado.isin(estados)]
if camaras: f = f[f.camara_origen.isin(camaras)]

k = st.columns(4)
ui.kpi(k[0], "Proyectos monitoreados", f"{len(f)}")
ui.kpi(k[1], "En tramitación",
       f"{(~f.estado.str.contains('terminada|Ley', case=False, na=False)).sum()}")
ui.kpi(k[2], "Con urgencia",
       f"{f.urgencia.str.contains('Suma|inmediata|Simple', case=False, na=False).sum()}")
ui.kpi(k[3], "Temas distintos", f"{f.tema.nunique()}")

st.divider()
c1, c2 = st.columns(2)
with c1:
    st.markdown("##### Proyectos por tema")
    fig = px.bar(f.groupby("tema").size().sort_values().reset_index(name="n"),
                 x="n", y="tema", orientation="h", color="n",
                 color_continuous_scale="Blues")
    fig.update_layout(height=360, coloraxis_showscale=False, xaxis_title="N°", yaxis_title=None,
                      margin=dict(t=10, b=10, l=10, r=10))
    st.plotly_chart(fig, use_container_width=True)
with c2:
    st.markdown("##### Distribución por estado de tramitación")
    fig2 = px.pie(f.groupby("estado").size().reset_index(name="n"),
                  names="estado", values="n", hole=0.4)
    fig2.update_layout(height=360, margin=dict(t=10, b=10, l=10, r=10))
    st.plotly_chart(fig2, use_container_width=True)

st.markdown("##### Detalle de tramitación")
vista = f.sort_values("fecha_movimiento", ascending=False)[
    ["boletin", "titulo", "tema", "camara_origen", "estado", "comision",
     "urgencia", "fecha_ingreso", "ultimo_movimiento", "fecha_movimiento", "url"]]
st.dataframe(vista, use_container_width=True, hide_index=True,
             column_config={"url": st.column_config.LinkColumn("Ficha")})

ui.botones_descarga(vista, "proyectos_ley", fig)
