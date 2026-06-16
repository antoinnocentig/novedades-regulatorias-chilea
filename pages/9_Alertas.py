"""Módulo 10 — Alertas automáticas."""
from __future__ import annotations

import streamlit as st
from electricidad import ui

ui.setup("Alertas", "🔔")
st.title("🔔 Alertas Automáticas")
ui.banner_modo()
st.markdown(
    "Generadas por el pipeline ETL ante: cambios de capacidad instalada, nuevos PMGD, "
    "nuevos proyectos de ley, publicación de reportes y nueva capacidad de almacenamiento."
)

df = ui.alertas()
if df.empty:
    st.success("No hay alertas registradas. Ejecuta el ETL para detectar cambios.")
    st.stop()

sev_color = {"critico": "🔴", "aviso": "🟠", "info": "🔵"}
k = st.columns(4)
ui.kpi(k[0], "Alertas totales", f"{len(df)}")
ui.kpi(k[1], "Críticas", f"{(df.severidad=='critico').sum()}")
ui.kpi(k[2], "Avisos", f"{(df.severidad=='aviso').sum()}")
ui.kpi(k[3], "No leídas", f"{(~df.leida).sum()}")

st.divider()
with st.sidebar:
    st.header("Filtros")
    sevs = st.multiselect("Severidad", sorted(df.severidad.unique()))
    mods = st.multiselect("Módulo", sorted(df.modulo.unique()))

f = df.copy()
if sevs: f = f[f.severidad.isin(sevs)]
if mods: f = f[f.modulo.isin(mods)]

for _, a in f.iterrows():
    icono = sev_color.get(a["severidad"], "⚪")
    with st.container(border=True):
        st.markdown(f"{icono} **{a['titulo']}**  \n"
                    f"<span style='color:gray'>{a['modulo']} · {a['tipo']} · "
                    f"{a['creada_en']}</span>", unsafe_allow_html=True)
        if a["detalle"]:
            st.caption(a["detalle"])

ui.botones_descarga(f[["creada_en", "severidad", "modulo", "tipo", "titulo", "detalle"]],
                    "alertas")
