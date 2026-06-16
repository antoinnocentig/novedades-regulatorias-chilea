"""Módulo 8 — Reportes CNE (repositorio Energía Abierta)."""
from __future__ import annotations

import streamlit as st
from electricidad import ui

ui.setup("Reportes CNE", "📑")
st.title("📑 Reportes CNE")
ui.banner_modo()
st.markdown(
    "Identificación automática de la versión más reciente de cada reporte oficial "
    "publicado en [energiaabierta.cl/reportes](http://energiaabierta.cl/reportes/). "
    "El pipeline descarga el PDF, extrae tablas (pdfplumber) y conserva el histórico."
)

df = ui.reportes()
if df.empty:
    st.warning("Sin reportes registrados."); st.stop()

df = df.sort_values(["tipo", "periodo"], ascending=[True, False])

st.subheader("Último reporte por tipo")
ultimos = df.sort_values("periodo").groupby("tipo").tail(1).sort_values("tipo")
cols = st.columns(len(ultimos)) if len(ultimos) <= 4 else st.columns(4)
for i, (_, r) in enumerate(ultimos.iterrows()):
    with cols[i % len(cols)]:
        st.markdown(f"**{r['tipo']}**")
        st.metric("Periodo más reciente", r["periodo"])
        if r["url"]:
            st.link_button("Abrir reporte ↗", r["url"], use_container_width=True)

st.divider()
st.subheader("Histórico de versiones")
tipo_sel = st.selectbox("Filtrar por tipo", ["Todos"] + sorted(df.tipo.unique()))
vista = df if tipo_sel == "Todos" else df[df.tipo == tipo_sel]
st.dataframe(
    vista[["tipo", "periodo", "titulo", "fecha_publicacion", "url", "fuente"]],
    use_container_width=True, hide_index=True,
    column_config={"url": st.column_config.LinkColumn("Enlace")},
)

st.subheader("Comparación automática contra el periodo anterior")
if tipo_sel != "Todos" and len(vista) >= 2:
    p = sorted(vista.periodo.unique())
    st.info(f"Reporte **{tipo_sel}**: último periodo **{p[-1]}** vs anterior **{p[-2]}**. "
            "Las tablas extraídas del PDF (cuando hay acceso en vivo) se almacenan en la "
            "columna `tablas_json` para construir comparaciones cuantitativas mes a mes.")
else:
    st.caption("Selecciona un tipo de reporte para ver la comparación intermensual.")

ui.botones_descarga(df, "reportes_cne")
