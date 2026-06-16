"""Módulo 2 — Capacidad Instalada."""
from __future__ import annotations

import plotly.express as px

import streamlit as st
from electricidad import ui

ui.setup("Capacidad Instalada", "🏭")
st.title("🏭 Capacidad Instalada")
ui.banner_modo()

df = ui.cap()
if df.empty:
    st.warning("Sin datos de capacidad."); st.stop()

# ── Filtros ──────────────────────────────────────────────────────────────────
with st.sidebar:
    st.header("Filtros")
    fechas = sorted(df.fecha.unique())
    rango = st.select_slider("Periodo", options=fechas,
                             value=(fechas[0], fechas[-1]))
    techs = st.multiselect("Tecnología", sorted(df.tecnologia.unique()))
    regiones = st.multiselect("Región", sorted(df.region.unique()))
    empresas = st.multiselect("Empresa", sorted(df.empresa.unique()))

f = df[(df.fecha >= rango[0]) & (df.fecha <= rango[1])]
if techs: f = f[f.tecnologia.isin(techs)]
if regiones: f = f[f.region.isin(regiones)]
if empresas: f = f[f.empresa.isin(empresas)]

ult = f.fecha.max()
total = f.loc[f.fecha == ult, "potencia_mw"].sum()
ernc = f.loc[(f.fecha == ult) & (f.es_ernc), "potencia_mw"].sum()
k = st.columns(3)
ui.kpi(k[0], "Capacidad seleccionada", ui.fmt(total, " MW"), ayuda=f"Mes {ui.periodo_label(ult)}")
ui.kpi(k[1], "Capacidad ERNC", ui.fmt(ernc, " MW"))
ui.kpi(k[2], "Participación ERNC", f"{(ernc/total*100 if total else 0):.1f}%")

st.divider()

# ── Evolución histórica + mix ────────────────────────────────────────────────
c1, c2 = st.columns([3, 2])
with c1:
    st.markdown("##### Evolución histórica por tecnología (barras apiladas)")
    evo = f.groupby(["fecha", "tecnologia"])["potencia_mw"].sum().reset_index()
    fig = px.bar(evo, x="fecha", y="potencia_mw", color="tecnologia",
                 color_discrete_map=ui.COLORES)
    fig.update_layout(height=420, barmode="stack", xaxis_title=None, yaxis_title="MW",
                      legend_title=None, margin=dict(t=10, b=10, l=10, r=10))
    st.plotly_chart(fig, use_container_width=True)
with c2:
    st.markdown("##### Mix tecnológico actual")
    mix = f[f.fecha == ult].groupby("tecnologia")["potencia_mw"].sum().reset_index()
    fig2 = px.treemap(mix, path=["tecnologia"], values="potencia_mw",
                      color="tecnologia", color_discrete_map=ui.COLORES)
    fig2.update_layout(height=420, margin=dict(t=10, b=10, l=10, r=10))
    st.plotly_chart(fig2, use_container_width=True)

# ── Por región / empresa / combustible ───────────────────────────────────────
c3, c4 = st.columns(2)
with c3:
    st.markdown("##### Capacidad por región")
    reg = (f[f.fecha == ult].groupby("region")["potencia_mw"].sum()
           .sort_values().reset_index())
    fig3 = px.bar(reg, x="potencia_mw", y="region", orientation="h", color="potencia_mw",
                  color_continuous_scale="Blues")
    fig3.update_layout(height=420, coloraxis_showscale=False, xaxis_title="MW", yaxis_title=None,
                       margin=dict(t=10, b=10, l=10, r=10))
    st.plotly_chart(fig3, use_container_width=True)
with c4:
    st.markdown("##### Top empresas por capacidad")
    emp = (f[f.fecha == ult].groupby("empresa")["potencia_mw"].sum()
           .sort_values(ascending=False).head(12).sort_values().reset_index())
    fig4 = px.bar(emp, x="potencia_mw", y="empresa", orientation="h", color="potencia_mw",
                  color_continuous_scale="Teal")
    fig4.update_layout(height=420, coloraxis_showscale=False, xaxis_title="MW", yaxis_title=None,
                       margin=dict(t=10, b=10, l=10, r=10))
    st.plotly_chart(fig4, use_container_width=True)

# ── Nuevos proyectos incorporados (variación último mes) ─────────────────────
st.markdown("##### Variación de capacidad por tecnología (último mes vs anterior)")
meses = sorted(f.fecha.unique())
if len(meses) >= 2:
    a, b = meses[-2], meses[-1]
    va = f[f.fecha == a].groupby("tecnologia")["potencia_mw"].sum()
    vb = f[f.fecha == b].groupby("tecnologia")["potencia_mw"].sum()
    delta = (vb - va).reindex(vb.index).fillna(0).sort_values()
    delta = delta[delta.abs() > 0.1].reset_index()
    delta.columns = ["tecnologia", "delta_mw"]
    if not delta.empty:
        fig5 = px.bar(delta, x="delta_mw", y="tecnologia", orientation="h",
                      color="delta_mw", color_continuous_scale="RdYlGn")
        fig5.update_layout(height=300, coloraxis_showscale=False, xaxis_title="Δ MW",
                           yaxis_title=None, margin=dict(t=10, b=10, l=10, r=10))
        st.plotly_chart(fig5, use_container_width=True)
    else:
        st.info("Sin variaciones relevantes en el último mes.")

st.divider()
st.markdown("##### Datos")
st.dataframe(f.sort_values(["fecha", "potencia_mw"], ascending=[False, False]),
             use_container_width=True, hide_index=True, height=300)
ui.botones_descarga(f, "capacidad_instalada", fig)
