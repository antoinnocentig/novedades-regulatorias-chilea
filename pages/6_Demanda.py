"""Módulo 7 — Demanda Eléctrica."""
from __future__ import annotations

import calendar

import plotly.express as px

import streamlit as st
from electricidad import ui

ui.setup("Demanda", "📈")
st.title("📈 Demanda Eléctrica")
ui.banner_modo()

df = ui.dem()
if df.empty:
    st.warning("Sin datos de demanda."); st.stop()

df = df.copy()
df["anio"] = df.fecha.str[:4]
df["mes"] = df.fecha.str[5:7].astype(int)

ult = df.fecha.max()
mes = df[df.fecha == ult]
prev_a = df[df.fecha == f"{int(ult[:4])-1}{ult[4:]}"]
k = st.columns(4)
ui.kpi(k[0], "Demanda mensual", ui.fmt(mes.demanda_gwh.sum(), " GWh"), ayuda=ui.periodo_label(ult))
ui.kpi(k[1], "Demanda máxima (punta)", ui.fmt(mes.demanda_maxima_mw.sum(), " MW"))
var = (mes.demanda_gwh.sum()/prev_a.demanda_gwh.sum()-1)*100 if not prev_a.empty else 0
ui.kpi(k[2], "Variación interanual", f"{var:+.1f}%")
ui.kpi(k[3], "Demanda anual (12m)",
       ui.fmt(df[df.fecha > f"{int(ult[:4])-1}{ult[4:]}"].demanda_gwh.sum(), " GWh"))

st.divider()
st.markdown("##### Curva histórica de demanda mensual (GWh)")
serie = df.groupby("fecha")["demanda_gwh"].sum().reset_index()
fig = px.line(serie, x="fecha", y="demanda_gwh", markers=False)
fig.update_traces(line_color="#e07a5f", line_width=2)
fig.update_layout(height=340, xaxis_title=None, yaxis_title="GWh",
                  margin=dict(t=10, b=10, l=10, r=10))
st.plotly_chart(fig, use_container_width=True)

c1, c2 = st.columns(2)
with c1:
    st.markdown("##### Variación por sector (mes actual)")
    sec = mes.groupby("sector")["demanda_gwh"].sum().sort_values().reset_index()
    fig2 = px.bar(sec, x="demanda_gwh", y="sector", orientation="h", color="demanda_gwh",
                  color_continuous_scale="Oranges")
    fig2.update_layout(height=360, coloraxis_showscale=False, xaxis_title="GWh", yaxis_title=None,
                       margin=dict(t=10, b=10, l=10, r=10))
    st.plotly_chart(fig2, use_container_width=True)
with c2:
    st.markdown("##### Heatmap demanda por mes y año")
    piv = (df.groupby(["anio", "mes"])["demanda_gwh"].sum().reset_index()
           .pivot(index="anio", columns="mes", values="demanda_gwh"))
    piv.columns = [calendar.month_abbr[m] for m in piv.columns]
    fig3 = px.imshow(piv, color_continuous_scale="YlOrRd", aspect="auto", text_auto=".0f")
    fig3.update_layout(height=360, xaxis_title=None, yaxis_title=None,
                       margin=dict(t=10, b=10, l=10, r=10))
    st.plotly_chart(fig3, use_container_width=True)

st.markdown("##### Demanda máxima (MW) — evolución")
punta = df.groupby("fecha")["demanda_maxima_mw"].sum().reset_index()
fig4 = px.area(punta, x="fecha", y="demanda_maxima_mw")
fig4.update_traces(line_color="#9a8c98", fillcolor="rgba(154,140,152,0.25)")
fig4.update_layout(height=300, xaxis_title=None, yaxis_title="MW",
                   margin=dict(t=10, b=10, l=10, r=10))
st.plotly_chart(fig4, use_container_width=True)

st.divider()
st.dataframe(df.sort_values("fecha", ascending=False), use_container_width=True,
             hide_index=True, height=280)
ui.botones_descarga(df, "demanda", fig)
