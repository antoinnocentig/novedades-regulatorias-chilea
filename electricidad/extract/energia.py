"""Extractores en vivo para los módulos de energía (vía CKAN Energía Abierta).

Cada función devuelve una lista de dicts ya normalizados al esquema de la BD,
o lista vacía si el portal no responde (la red está bloqueada o el dataset no
existe). El pipeline decide entonces sembrar con datos de respaldo.
"""
from __future__ import annotations

import pandas as pd

from ..ckan import CKANClient
from ..config import sources
from ..transform import es_ernc, find_column, parse_fecha, to_float


def _cols(modulo: str) -> dict:
    return sources()["modulos"][modulo]["columnas"]


def _queries(modulo: str) -> list[str]:
    return sources()["modulos"][modulo]["ckan_queries"]


def capacidad(client: CKANClient | None = None) -> list[dict]:
    client = client or CKANClient()
    df = client.find_dataset_csv(_queries("capacidad_instalada"))
    if df.empty:
        return []
    c = _cols("capacidad_instalada")
    col_f = find_column(df, c["fecha"])
    col_t = find_column(df, c["tecnologia"])
    col_p = find_column(df, c["potencia_mw"])
    if not (col_t and col_p):
        return []
    col_r = find_column(df, c["region"])
    col_e = find_column(df, c["empresa"])
    fuente = df.attrs.get("fuente", "Energía Abierta · capacidad instalada")
    rows = []
    for _, r in df.iterrows():
        tec = str(r[col_t])
        rows.append(dict(
            fecha=parse_fecha(r[col_f]) if col_f else "2026-01-01",
            region=str(r[col_r]) if col_r else "Nacional",
            tecnologia=tec, combustible=tec,
            empresa=str(r[col_e]) if col_e else "",
            potencia_mw=to_float(r[col_p]), es_ernc=es_ernc(tec), fuente=fuente,
        ))
    return [x for x in rows if x["fecha"]]


def generacion(client: CKANClient | None = None) -> list[dict]:
    client = client or CKANClient()
    df = client.find_dataset_csv(_queries("generacion"))
    if df.empty:
        return []
    c = _cols("generacion")
    col_f = find_column(df, c["fecha"])
    col_t = find_column(df, c["tecnologia"])
    col_g = find_column(df, c["energia_gwh"])
    if not (col_f and col_t and col_g):
        return []
    col_r = find_column(df, c["region"])
    fuente = df.attrs.get("fuente", "Energía Abierta · generación")
    rows = []
    for _, r in df.iterrows():
        tec = str(r[col_t])
        rows.append(dict(
            fecha=parse_fecha(r[col_f]),
            region=str(r[col_r]) if col_r else "Nacional",
            tecnologia=tec, empresa="", energia_gwh=to_float(r[col_g]),
            es_ernc=es_ernc(tec), fuente=fuente,
        ))
    return [x for x in rows if x["fecha"]]


def demanda(client: CKANClient | None = None) -> list[dict]:
    client = client or CKANClient()
    df = client.find_dataset_csv(_queries("demanda"))
    if df.empty:
        return []
    c = _cols("demanda")
    col_f = find_column(df, c["fecha"])
    col_d = find_column(df, c["demanda_gwh"])
    if not (col_f and col_d):
        return []
    col_s = find_column(df, c["sector"])
    col_m = find_column(df, c["demanda_maxima_mw"])
    fuente = df.attrs.get("fuente", "Energía Abierta · demanda")
    rows = []
    for _, r in df.iterrows():
        rows.append(dict(
            fecha=parse_fecha(r[col_f]), region="Nacional",
            sector=str(r[col_s]) if col_s else "Total",
            demanda_gwh=to_float(r[col_d]),
            demanda_maxima_mw=to_float(r[col_m]) if col_m else 0.0, fuente=fuente,
        ))
    return [x for x in rows if x["fecha"]]


def pmgd(client: CKANClient | None = None) -> list[dict]:
    client = client or CKANClient()
    df = client.find_dataset_csv(_queries("pmgd"))
    if df.empty:
        return []
    c = _cols("pmgd")
    col_n = find_column(df, c["nombre"])
    col_p = find_column(df, c["potencia_mw"])
    if not (col_n and col_p):
        return []
    g = lambda r, col: str(r[col]) if col else ""  # noqa: E731
    cn, cr, cc, ct = (find_column(df, c[k]) for k in ("nombre", "region", "comuna", "tecnologia"))
    ce, cla, clo = (find_column(df, c[k]) for k in ("estado", "lat", "lon"))
    fuente = df.attrs.get("fuente", "Energía Abierta · PMGD")
    rows = []
    for _, r in df.iterrows():
        rows.append(dict(
            nombre=g(r, cn), region=g(r, cr), comuna=g(r, cc), tecnologia=g(r, ct),
            potencia_mw=to_float(r[col_p]), estado=g(r, ce) or "Operación",
            lat=to_float(r[cla]) if cla else None,
            lon=to_float(r[clo]) if clo else None,
            fecha_operacion="", fuente=fuente,
        ))
    return [x for x in rows if x["nombre"]]


def almacenamiento(client: CKANClient | None = None) -> list[dict]:
    client = client or CKANClient()
    df = client.find_dataset_csv(_queries("almacenamiento"))
    if df.empty:
        return []
    c = _cols("almacenamiento")
    col_n = find_column(df, c["nombre"])
    col_p = find_column(df, c["potencia_mw"])
    if not (col_n and col_p):
        return []
    cr, cmwh, ce = (find_column(df, c[k]) for k in ("region", "energia_mwh", "estado"))
    fuente = df.attrs.get("fuente", "Energía Abierta · almacenamiento")
    rows = []
    for _, r in df.iterrows():
        rows.append(dict(
            nombre=str(r[col_n]), region=str(r[cr]) if cr else "",
            tecnologia="BESS", potencia_mw=to_float(r[col_p]),
            energia_mwh=to_float(r[cmwh]) if cmwh else 0.0,
            estado=str(r[ce]) if ce else "", propietario="", fecha="", fuente=fuente,
        ))
    return [x for x in rows if x["nombre"]]
