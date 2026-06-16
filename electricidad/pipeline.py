"""Orquestador ETL.

Por cada módulo intenta extracción EN VIVO desde las fuentes oficiales; si no
hay datos (red bloqueada, portal caído, dataset movido) cae a datos SEED para
que el dashboard nunca quede vacío. Registra cada ejecución en `etl_run`.
"""
from __future__ import annotations

import logging
from datetime import datetime

from sqlalchemy import func, select

from . import alerts, seed
from .ckan import CKANClient
from .config import AUTO_SEED, OFFLINE_ONLY
from .db import get_session, init_db
from .extract import energia, legislativo, reportes
from .load import replace_table, upsert
from .models import (
    Almacenamiento,
    CapacidadInstalada,
    Demanda,
    EtlRun,
    Generacion,
    PMGD,
    ProyectoLey,
    ReporteCNE,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("pipeline")


def _registrar(session, fuente, estado, filas, modo, mensaje=""):
    session.add(EtlRun(fuente=fuente, inicio=datetime.utcnow(), fin=datetime.utcnow(),
                       estado=estado, filas=filas, modo=modo, mensaje=mensaje[:1000]))


def _live(extractor, client):
    """Ejecuta un extractor en vivo, salvo en modo OFFLINE_ONLY."""
    if OFFLINE_ONLY:
        return []
    try:
        return extractor(client)
    except Exception as exc:  # nunca dejar caer el pipeline por la red
        log.warning("Extractor %s falló: %s", getattr(extractor, "__name__", extractor), exc)
        return []


def _snapshot(session, fuente, model, live_rows, seed_fn):
    """Refresca una tabla snapshot eligiendo live > seed."""
    if not OFFLINE_ONLY and live_rows:
        n = replace_table(session, model, live_rows)
        _registrar(session, fuente, "ok", n, "live")
        log.info("%s: %s filas EN VIVO", fuente, n)
        return n, "live"
    if AUTO_SEED:
        rows = seed_fn()
        n = replace_table(session, model, rows)
        _registrar(session, fuente, "sin_red", n, "seed",
                   "Sin datos en vivo; sembrado de respaldo")
        log.info("%s: %s filas SEED (sin datos en vivo)", fuente, n)
        return n, "seed"
    _registrar(session, fuente, "error", 0, "live", "Sin datos y AUTO_SEED desactivado")
    return 0, "vacio"


def ejecutar() -> dict:
    init_db()
    client = CKANClient()
    resumen: dict[str, str] = {}

    with get_session() as s:
        # ── Snapshots de energía ────────────────────────────────────────────
        _snapshot(s, "capacidad", CapacidadInstalada,
                  _live(energia.capacidad, client), seed.capacidad_rows)
        _snapshot(s, "generacion", Generacion,
                  _live(energia.generacion, client), seed.generacion_rows)
        _snapshot(s, "demanda", Demanda,
                  _live(energia.demanda, client), seed.demanda_rows)
        _snapshot(s, "pmgd", PMGD,
                  _live(energia.pmgd, client), seed.pmgd_rows)
        n_alm, _ = _snapshot(s, "almacenamiento", Almacenamiento,
                             _live(energia.almacenamiento, client), seed.almacenamiento_rows)

        # ── Reportes CNE (incremental → alerta de nuevos) ───────────────────
        live_rep = [] if OFFLINE_ONLY else reportes.listar_reportes()
        rep_rows = live_rep if live_rep else (seed.reportes_rows() if AUTO_SEED else [])
        _, nuevos_rep = upsert(s, ReporteCNE, rep_rows, keys=["tipo", "periodo"])
        _registrar(s, "reportes_cne", "ok" if live_rep else "sin_red",
                   len(rep_rows), "live" if live_rep else "seed")

        # ── Legislativo (incremental → alerta de nuevos) ────────────────────
        live_ley = [] if OFFLINE_ONLY else legislativo.extraer()
        ley_rows = live_ley if live_ley else (seed.proyectos_ley_rows() if AUTO_SEED else [])
        ley_rows = [r for r in ley_rows if r.get("boletin")]
        _, nuevos_ley = upsert(s, ProyectoLey, ley_rows, keys=["boletin"])
        _registrar(s, "legislativo", "ok" if live_ley else "sin_red",
                   len(ley_rows), "live" if live_ley else "seed")

        # ── Alertas (capacidad: último mes vs mes anterior) ──────────────────
        meses = [m[0] for m in s.execute(
            select(CapacidadInstalada.fecha).distinct()
            .order_by(CapacidadInstalada.fecha.desc()).limit(2)).all()]
        ult = meses[0] if meses else "actual"
        cap_ult = s.execute(select(func.sum(CapacidadInstalada.potencia_mw))
                            .where(CapacidadInstalada.fecha == ult)).scalar() or 0.0
        cap_prev = (s.execute(select(func.sum(CapacidadInstalada.potencia_mw))
                              .where(CapacidadInstalada.fecha == meses[1])).scalar() or 0.0
                    ) if len(meses) > 1 else 0.0
        a = alerts.alertas_capacidad(s, cap_ult, cap_prev, ult)
        a += alerts.alertas_nuevos_reportes(s, nuevos_rep)
        a += alerts.alertas_nuevos_proyectos(s, nuevos_ley)
        tot_alm = s.execute(select(func.sum(Almacenamiento.potencia_mw))
                            .where(Almacenamiento.estado == "Operación")).scalar() or 0.0
        a += alerts.alertas_almacenamiento(s, tot_alm, ult[:7])

        resumen = dict(capacidad_ultimo_mes_mw=round(cap_ult), alertas_generadas=a,
                       reportes=len(rep_rows), proyectos_ley=len(ley_rows),
                       almacenamiento_proyectos=n_alm)
    log.info("ETL finalizado: %s", resumen)
    return resumen


if __name__ == "__main__":
    ejecutar()
