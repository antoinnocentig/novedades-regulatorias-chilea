"""Módulo 3 — Generación Eléctrica."""
from __future__ import annotations

import plotly.express as px

import streamlit as st
from electricidad import ui

ui.setup("Generación", "🔌")
st.title("🔌 Generación Eléctrica")
ui.banner_modo()

df = ui.gen()
if df.empty:
    st.warning("Sin datos de generación."); st.stop()

with st.sidebar:
    st.header("Filtros")
    fechas = sorted(df.fecha.unique())
    rango = st.select_slider("Periodo", options=fechas, value=(fechas[0], fechas[-1]))
    techs = st.multiselect("Tecnología", sorted(df.tecnologia.unique()))
    regiones = st.multiselect("Región", sorted(df.region.unique()))
    vista = st.radio("Agregación temporal", ["Mensual", "Anual"], horizontal=True)

f = df[(df.fecha >= rango[0]) & (df.fecha <= rango[1])].copy()
if techs: f = f[f.tecnologia.isin(techs)]
if regiones: f = f[f.region.isin(regiones)]
f["anio"] = f.fecha.str[:4]
clave = "anio" if vista == "Anual" else "fecha"

# ── Indicadores por tecnología (último mes) ──────────────────────────────────
ult = f.fecha.max()
mes = f[f.fecha == ult]
st.subheader(f"Generación por tecnología — {ui.periodo_label(ult)}")
porte = mes.groupby("tecnologia")["energia_gwh"].sum()
orden = ["Hidro embalse", "Hidro pasada", "Mini-hidro", "Solar", "Eólica",
         "Gas", "Carbón", "Diésel", "Biomasa", "Geotermia"]
cols = st.columns(5)
for i, t in enumerate([t for t in orden if t in porte.index]):
    ui.kpi(cols[i % 5], t, ui.fmt(porte[t], " GWh"))

st.divider()
c1, c2 = st.columns([3, 2])
with c1:
    st.markdown(f"##### Generación {vista.lower()} por tecnología (apilada)")
    g = f.groupby([clave, "tecnologia"])["energia_gwh"].sum().reset_index()
    fig = px.bar(g, x=clave, y="energia_gwh", color="tecnologia",
                 color_discrete_map=ui.COLORES)
    fig.update_layout(height=430, barmode="stack", xaxis_title=None, yaxis_title="GWh",
                      legend_title=None, margin=dict(t=10, b=10, l=10, r=10))
    st.plotly_chart(fig, use_container_width=True)
with c2:
    st.markdown("##### Participación del mes")
    fig2 = px.pie(mes.groupby("tecnologia")["energia_gwh"].sum().reset_index(),
                  names="tecnologia", values="energia_gwh", hole=0.4,
                  color="tecnologia", color_discrete_map=ui.COLORES)
    fig2.update_layout(height=430, margin=dict(t=10, b=10, l=10, r=10))
    st.plotly_chart(fig2, use_container_width=True)

st.markdown("##### Generación por región (último periodo)")
reg = mes.groupby("region")["energia_gwh"].sum().sort_values().reset_index()
fig3 = px.bar(reg, x="energia_gwh", y="region", orientation="h", color="energia_gwh",
              color_continuous_scale="Viridis")
fig3.update_layout(height=380, coloraxis_showscale=False, xaxis_title="GWh", yaxis_title=None,
                   margin=dict(t=10, b=10, l=10, r=10))
st.plotly_chart(fig3, use_container_width=True)

st.divider()
st.dataframe(f.sort_values("fecha", ascending=False), use_container_width=True,
             hide_index=True, height=300)
ui.botones_descarga(f, "generacion", fig)
