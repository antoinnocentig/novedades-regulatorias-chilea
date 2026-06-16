"""
Dashboard Inteligente del Mercado Eléctrico Chileno — Resumen Ejecutivo.

Ejecutar:  streamlit run streamlit_app.py
Las demás secciones están en la carpeta pages/ (navegación lateral).
"""
from __future__ import annotations

import plotly.express as px
import plotly.graph_objects as go

import streamlit as st
from electricidad import ui

ui.setup("Resumen Ejecutivo")

st.title("⚡ Mercado Eléctrico Chileno — Dashboard Inteligente")
st.markdown(
    "Consolidación automática de **Energía Abierta (CNE)**, reportes oficiales y "
    "tramitación legislativa del Congreso. Navega los módulos en la barra lateral."
)
ui.banner_modo()

cap, gen, dem = ui.cap(), ui.gen(), ui.dem()
pmgd, alm = ui.pmgd(), ui.alm()


def _ultimo(df, col_fecha="fecha"):
    return df[col_fecha].max() if not df.empty else None


def _mes_previo(fecha: str) -> str:
    y, m = int(fecha[:4]), int(fecha[5:7])
    y, m = (y - 1, 12) if m == 1 else (y, m - 1)
    return f"{y}-{m:02d}-01"


def _anio_previo(fecha: str) -> str:
    return f"{int(fecha[:4]) - 1}{fecha[4:]}"


ult_cap = _ultimo(cap)
ult_gen = _ultimo(gen)
ult_dem = _ultimo(dem)

# ── KPIs principales ─────────────────────────────────────────────────────────
st.subheader(f"Indicadores clave — {ui.periodo_label(ult_cap) if ult_cap else 's/d'}")

cap_total = cap.loc[cap.fecha == ult_cap, "potencia_mw"].sum() if ult_cap else 0
cap_prev_m = cap.loc[cap.fecha == _mes_previo(ult_cap), "potencia_mw"].sum() if ult_cap else 0
cap_prev_a = cap.loc[cap.fecha == _anio_previo(ult_cap), "potencia_mw"].sum() if ult_cap else 0

gen_mes = gen.loc[gen.fecha == ult_gen] if ult_gen else gen.iloc[0:0]
gen_total = gen_mes["energia_gwh"].sum()
gen_ernc = gen_mes.loc[gen_mes.es_ernc, "energia_gwh"].sum()
part_ernc = (gen_ernc / gen_total * 100) if gen_total else 0
gen_prev_a = gen.loc[gen.fecha == _anio_previo(ult_gen), "energia_gwh"].sum() if ult_gen else 0

pmgd_op = pmgd[pmgd.estado == "Operación"]
alm_total = alm.loc[alm.estado == "Operación", "potencia_mw"].sum()
dem_mes = dem.loc[dem.fecha == ult_dem, "demanda_gwh"].sum() if ult_dem else 0
dem_prev_a = dem.loc[dem.fecha == _anio_previo(ult_dem), "demanda_gwh"].sum() if ult_dem else 0

r1 = st.columns(4)
ui.kpi(r1[0], "Capacidad instalada SEN", ui.fmt(cap_total, " MW"),
       ui.fmt(cap_total - cap_prev_m, " MW vs mes ant."))
ui.kpi(r1[1], "Generación mensual", ui.fmt(gen_total, " GWh"),
       f"{((gen_total/gen_prev_a-1)*100):+.1f}% interanual" if gen_prev_a else None)
ui.kpi(r1[2], "Generación ERNC", ui.fmt(gen_ernc, " GWh"))
ui.kpi(r1[3], "Participación ERNC", f"{part_ernc:.1f}%")

r2 = st.columns(4)
ui.kpi(r2[0], "PMGD en operación", f"{len(pmgd_op)}",
       ui.fmt(pmgd_op.potencia_mw.sum(), " MW"))
ui.kpi(r2[1], "Almacenamiento (BESS) op.", ui.fmt(alm_total, " MW"),
       ui.fmt(alm.energia_mwh.sum(), " MWh totales"))
ui.kpi(r2[2], "Demanda mensual", ui.fmt(dem_mes, " GWh"),
       f"{((dem_mes/dem_prev_a-1)*100):+.1f}% interanual" if dem_prev_a else None)
ui.kpi(r2[3], "Variación capacidad anual",
       f"{((cap_total/cap_prev_a-1)*100):+.1f}%" if cap_prev_a else "s/d")

st.divider()

# ── Gráficos resumen ─────────────────────────────────────────────────────────
c1, c2 = st.columns(2)

with c1:
    st.markdown("##### Matriz de capacidad por tecnología")
    if ult_cap:
        mix = (cap[cap.fecha == ult_cap].groupby("tecnologia")["potencia_mw"]
               .sum().sort_values(ascending=False).reset_index())
        fig = px.pie(mix, names="tecnologia", values="potencia_mw", hole=0.45,
                     color="tecnologia", color_discrete_map=ui.COLORES)
        fig.update_layout(margin=dict(t=10, b=10, l=10, r=10), height=360)
        st.plotly_chart(fig, use_container_width=True)

with c2:
    st.markdown("##### Evolución de capacidad instalada (MW)")
    evo = cap.groupby("fecha")["potencia_mw"].sum().reset_index()
    fig2 = px.area(evo, x="fecha", y="potencia_mw")
    fig2.update_traces(line_color="#1d6fb8", fillcolor="rgba(29,111,184,0.25)")
    fig2.update_layout(margin=dict(t=10, b=10, l=10, r=10), height=360,
                       yaxis_title="MW", xaxis_title=None)
    st.plotly_chart(fig2, use_container_width=True)

st.markdown("##### Evolución de la participación ERNC en generación")
serie = (gen.groupby(["fecha"]).apply(
    lambda d: d.loc[d.es_ernc, "energia_gwh"].sum() / d["energia_gwh"].sum() * 100
    if d["energia_gwh"].sum() else 0).reset_index(name="part_ernc"))
fig3 = go.Figure(go.Scatter(x=serie["fecha"], y=serie["part_ernc"], mode="lines",
                            line=dict(color="#34a0a4", width=2), fill="tozeroy",
                            fillcolor="rgba(52,160,164,0.15)"))
fig3.update_layout(height=300, margin=dict(t=10, b=10, l=10, r=10),
                   yaxis_title="% ERNC", xaxis_title=None)
st.plotly_chart(fig3, use_container_width=True)

with st.expander("ℹ️ Fuentes y trazabilidad"):
    st.dataframe(ui.queries.etl_runs(), use_container_width=True, hide_index=True)
    st.caption("Cada fila registra una ejecución del pipeline ETL (fuente, modo, filas, estado).")
