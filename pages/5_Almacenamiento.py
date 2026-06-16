"""Módulo 6 — Almacenamiento (BESS)."""
from __future__ import annotations

import plotly.express as px

import streamlit as st
from electricidad import ui

ui.setup("Almacenamiento", "🔋")
st.title("🔋 Almacenamiento de Energía (BESS)")
ui.banner_modo()

df = ui.alm()
if df.empty:
    st.warning("Sin datos de almacenamiento."); st.stop()

op = df[df.estado == "Operación"]
k = st.columns(4)
ui.kpi(k[0], "Potencia en operación", ui.fmt(op.potencia_mw.sum(), " MW"))
ui.kpi(k[1], "Energía en operación", ui.fmt(op.energia_mwh.sum(), " MWh"))
ui.kpi(k[2], "Proyectos en construcción", f"{(df.estado=='Construcción').sum()}",
       ui.fmt(df.loc[df.estado=='Construcción','potencia_mw'].sum(), " MW"))
ui.kpi(k[3], "Cartera total (todos)", ui.fmt(df.potencia_mw.sum(), " MW"),
       f"{len(df)} proyectos")

st.divider()
c1, c2 = st.columns(2)
with c1:
    st.markdown("##### Potencia por estado de avance")
    est = df.groupby("estado")[["potencia_mw"]].sum().reset_index()
    fig = px.bar(est, x="estado", y="potencia_mw", color="estado", text_auto=".0f")
    fig.update_layout(height=380, showlegend=False, xaxis_title=None, yaxis_title="MW",
                      margin=dict(t=10, b=10, l=10, r=10))
    st.plotly_chart(fig, use_container_width=True)
with c2:
    st.markdown("##### Potencia (MW) por región")
    reg = df.groupby("region")["potencia_mw"].sum().sort_values().reset_index()
    fig2 = px.bar(reg, x="potencia_mw", y="region", orientation="h", color="potencia_mw",
                  color_continuous_scale="Purples")
    fig2.update_layout(height=380, coloraxis_showscale=False, xaxis_title="MW", yaxis_title=None,
                       margin=dict(t=10, b=10, l=10, r=10))
    st.plotly_chart(fig2, use_container_width=True)

st.markdown("##### Relación potencia (MW) vs energía (MWh) — duración del sistema")
fig3 = px.scatter(df, x="potencia_mw", y="energia_mwh", color="estado", size="potencia_mw",
                  hover_name="nombre", text="nombre")
fig3.update_traces(textposition="top center", textfont_size=9)
fig3.update_layout(height=420, xaxis_title="Potencia (MW)", yaxis_title="Energía (MWh)",
                   margin=dict(t=10, b=10, l=10, r=10))
st.plotly_chart(fig3, use_container_width=True)

st.info("Fuente complementaria: proyectos en evaluación se cruzan con el SEIA "
        "(seia.sea.gob.cl) cuando Energía Abierta no publica el dato.")
st.divider()
st.dataframe(df.sort_values("potencia_mw", ascending=False), use_container_width=True,
             hide_index=True)
ui.botones_descarga(df, "almacenamiento_bess", fig3)
