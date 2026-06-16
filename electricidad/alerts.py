"""Generación de alertas automáticas a partir de cambios detectados."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .models import Alerta


def _crear(session: Session, *, tipo: str, titulo: str, detalle: str,
           modulo: str, severidad: str, clave: str) -> bool:
    """Inserta una alerta si no existe otra con la misma clave (dedupe)."""
    existe = session.execute(
        select(Alerta.id).where(Alerta.clave == clave)
    ).first()
    if existe:
        return False
    session.add(Alerta(
        tipo=tipo, titulo=titulo, detalle=detalle, modulo=modulo,
        severidad=severidad, clave=clave, creada_en=datetime.utcnow(),
    ))
    return True


def alertas_nuevos_reportes(session: Session, nuevos: list[dict]) -> int:
    n = 0
    for r in nuevos:
        if _crear(session, tipo="nuevo_reporte",
                  titulo=f"Nuevo reporte: {r['tipo']} {r['periodo']}",
                  detalle=r.get("url", ""), modulo="reportes", severidad="info",
                  clave=f"reporte:{r['tipo']}:{r['periodo']}"):
            n += 1
    return n


def alertas_nuevos_proyectos(session: Session, nuevos: list[dict]) -> int:
    n = 0
    for p in nuevos:
        if _crear(session, tipo="nuevo_proyecto_ley",
                  titulo=f"Nuevo proyecto de ley (Bol. {p['boletin']}): {p['titulo'][:90]}",
                  detalle=f"Tema: {p.get('tema','')} · Estado: {p.get('estado','')}",
                  modulo="legislativo", severidad="aviso",
                  clave=f"proyecto:{p['boletin']}"):
            n += 1
    return n


def alertas_capacidad(session: Session, total_actual_mw: float,
                      total_previo_mw: float, periodo: str) -> int:
    if total_previo_mw <= 0:
        return 0
    delta = total_actual_mw - total_previo_mw
    pct = delta / total_previo_mw * 100
    if abs(pct) < 0.5:  # umbral: cambios menores se ignoran
        return 0
    sev = "aviso" if abs(pct) < 3 else "critico"
    signo = "+" if delta >= 0 else ""
    if _crear(session, tipo="cambio_capacidad",
              titulo=f"Cambio de capacidad instalada: {signo}{delta:,.0f} MW ({signo}{pct:.1f}%)",
              detalle=f"Periodo {periodo}: {total_actual_mw:,.0f} MW",
              modulo="capacidad", severidad=sev, clave=f"capacidad:{periodo}"):
        return 1
    return 0


def alertas_almacenamiento(session: Session, total_mw: float, periodo: str) -> int:
    if _crear(session, tipo="capacidad_almacenamiento",
              titulo=f"Capacidad de almacenamiento (BESS): {total_mw:,.0f} MW registrados",
              detalle=f"Actualización {periodo}", modulo="almacenamiento",
              severidad="info", clave=f"bess:{periodo}"):
        return 1
    return 0


def contar_no_leidas(session: Session) -> int:
    return session.execute(
        select(func.count(Alerta.id)).where(Alerta.leida.is_(False))
    ).scalar_one()
