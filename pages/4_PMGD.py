"""Módulo 5 — PMGD (Pequeños Medios de Generación Distribuida)."""
from __future__ import annotations

import plotly.express as px
import pydeck as pdk

import streamlit as st
from electricidad import ui

ui.setup("PMGD", "📍")
st.title("📍 PMGD — Pequeños Medios de Generación Distribuida")
ui.banner_modo()

df = ui.pmgd()
if df.empty:
    st.warning("Sin datos de PMGD."); st.stop()

with st.sidebar:
    st.header("Filtros")
    estados = st.multiselect("Estado", sorted(df.estado.unique()),
                             default=sorted(df.estado.unique()))
    techs = st.multiselect("Tecnología", sorted(df.tecnologia.unique()))
    regiones = st.multiselect("Región", sorted(df.region.unique()))

f = df[df.estado.isin(estados)] if estados else df
if techs: f = f[f.tecnologia.isin(techs)]
if regiones: f = f[f.region.isin(regiones)]

k = st.columns(4)
ui.kpi(k[0], "Proyectos PMGD", f"{len(f)}")
ui.kpi(k[1], "En operación", f"{(f.estado=='Operación').sum()}")
ui.kpi(k[2], "En construcción", f"{(f.estado=='Construcción').sum()}")
ui.kpi(k[3], "Potencia total", ui.fmt(f.potencia_mw.sum(), " MW"))

st.divider()
st.markdown("##### Mapa interactivo de PMGD")
mapa = f.dropna(subset=["lat", "lon"])
if not mapa.empty:
    color = {"Operación": [46, 160, 67], "Construcción": [240, 173, 0],
             "Pruebas": [114, 9, 183]}
    mapa = mapa.assign(
        _color=mapa.estado.map(lambda e: color.get(e, [120, 120, 120])),
        _radio=mapa.potencia_mw * 800)
    st.pydeck_chart(pdk.Deck(
        map_style=None,
        initial_view_state=pdk.ViewState(latitude=-35.0, longitude=-71.3, zoom=4.2),
        layers=[pdk.Layer("ScatterplotLayer", data=mapa,
                          get_position=["lon", "lat"], get_fill_color="_color",
                          get_radius="_radio", pickable=True, opacity=0.7)],
        tooltip={"text": "{nombre}\n{comuna}, {region}\n{tecnologia} · {potencia_mw} MW\n{estado}"},
    ))
    st.caption("🟢 Operación · 🟡 Construcción · 🟣 Pruebas — tamaño ∝ potencia (MW)")

c1, c2 = st.columns(2)
with c1:
    st.markdown("##### PMGD por región")
    reg = f.groupby("region")["potencia_mw"].sum().sort_values().reset_index()
    fig = px.bar(reg, x="potencia_mw", y="region", orientation="h", color="potencia_mw",
                 color_continuous_scale="Greens")
    fig.update_layout(height=380, coloraxis_showscale=False, xaxis_title="MW", yaxis_title=None,
                      margin=dict(t=10, b=10, l=10, r=10))
    st.plotly_chart(fig, use_container_width=True)
with c2:
    st.markdown("##### PMGD por tecnología")
    fig2 = px.pie(f.groupby("tecnologia")["potencia_mw"].sum().reset_index(),
                  names="tecnologia", values="potencia_mw", hole=0.4,
                  color="tecnologia", color_discrete_map=ui.COLORES)
    fig2.update_layout(height=380, margin=dict(t=10, b=10, l=10, r=10))
    st.plotly_chart(fig2, use_container_width=True)

st.markdown("##### Distribución por potencia instalada")
fig3 = px.histogram(f, x="potencia_mw", nbins=20, color="estado")
fig3.update_layout(height=300, xaxis_title="MW por proyecto", yaxis_title="N° proyectos",
                   margin=dict(t=10, b=10, l=10, r=10))
st.plotly_chart(fig3, use_container_width=True)

st.divider()
st.dataframe(f.sort_values("potencia_mw", ascending=False), use_container_width=True,
             hide_index=True, height=300)
ui.botones_descarga(f, "pmgd", fig)
