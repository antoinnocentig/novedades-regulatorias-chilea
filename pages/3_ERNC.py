"""Módulo 4 — ERNC (Energías Renovables No Convencionales)."""
from __future__ import annotations

import plotly.express as px
import plotly.graph_objects as go

import streamlit as st
from electricidad import ui

ui.setup("ERNC", "🌱")
st.title("🌱 ERNC — Energías Renovables No Convencionales")
ui.banner_modo()

gen, cap = ui.gen(), ui.cap()
if gen.empty:
    st.warning("Sin datos."); st.stop()

ult = gen.fecha.max()
mes = gen[gen.fecha == ult]
gen_total = mes.energia_gwh.sum()
gen_ernc = mes.loc[mes.es_ernc, "energia_gwh"].sum()
cap_ult = cap[cap.fecha == cap.fecha.max()]
cap_ernc = cap_ult.loc[cap_ult.es_ernc, "potencia_mw"].sum()

k = st.columns(4)
ui.kpi(k[0], "Participación ERNC (gen.)", f"{gen_ernc/gen_total*100:.1f}%", ayuda=ui.periodo_label(ult))
ui.kpi(k[1], "Generación ERNC", ui.fmt(gen_ernc, " GWh"))
ui.kpi(k[2], "Capacidad ERNC", ui.fmt(cap_ernc, " MW"))
ui.kpi(k[3], "Capacidad ERNC / total", f"{cap_ernc/cap_ult.potencia_mw.sum()*100:.1f}%")

st.divider()

# ── Evolución de la participación ERNC ───────────────────────────────────────
st.markdown("##### Evolución de la participación ERNC en la generación")
serie = (gen.groupby("fecha").apply(
    lambda d: d.loc[d.es_ernc, "energia_gwh"].sum() / d.energia_gwh.sum() * 100
    if d.energia_gwh.sum() else 0).reset_index(name="pct"))
fig = go.Figure(go.Scatter(x=serie.fecha, y=serie.pct, mode="lines",
                           line=dict(color="#34a0a4", width=2.5), fill="tozeroy",
                           fillcolor="rgba(52,160,164,0.15)"))
fig.add_hline(y=20, line_dash="dot", line_color="gray",
              annotation_text="Meta histórica 20% (Ley 20.257)")
fig.update_layout(height=340, yaxis_title="% ERNC", xaxis_title=None,
                  margin=dict(t=10, b=10, l=10, r=10))
st.plotly_chart(fig, use_container_width=True)

c1, c2 = st.columns(2)
with c1:
    st.markdown("##### Evolución de generación ERNC por tecnología")
    ernc = gen[gen.es_ernc]
    g = ernc.groupby(["fecha", "tecnologia"])["energia_gwh"].sum().reset_index()
    fig2 = px.area(g, x="fecha", y="energia_gwh", color="tecnologia",
                   color_discrete_map=ui.COLORES)
    fig2.update_layout(height=380, xaxis_title=None, yaxis_title="GWh", legend_title=None,
                       margin=dict(t=10, b=10, l=10, r=10))
    st.plotly_chart(fig2, use_container_width=True)
with c2:
    st.markdown("##### Ranking de tecnologías ERNC (mes actual)")
    rank = (mes[mes.es_ernc].groupby("tecnologia")["energia_gwh"].sum()
            .sort_values().reset_index())
    fig3 = px.bar(rank, x="energia_gwh", y="tecnologia", orientation="h",
                  color="tecnologia", color_discrete_map=ui.COLORES)
    fig3.update_layout(height=380, showlegend=False, xaxis_title="GWh", yaxis_title=None,
                       margin=dict(t=10, b=10, l=10, r=10))
    st.plotly_chart(fig3, use_container_width=True)

st.divider()
tabla = (gen[gen.es_ernc].groupby(["fecha", "tecnologia"])["energia_gwh"].sum()
         .reset_index().sort_values("fecha", ascending=False))
st.dataframe(tabla, use_container_width=True, hide_index=True, height=280)
ui.botones_descarga(tabla, "ernc", fig2)
