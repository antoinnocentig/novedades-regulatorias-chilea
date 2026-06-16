"""Extractor del repositorio de reportes CNE (energiaabierta.cl/reportes/).

Estrategia:
  1. Descargar el HTML del repositorio.
  2. Encontrar todos los enlaces a PDF.
  3. Clasificar cada PDF por tipo (regex de config) y extraer su periodo.
  4. Quedarse con el más reciente por tipo.
  5. (Opcional) descargar el PDF y extraer tablas con pdfplumber.
"""
from __future__ import annotations

import hashlib
import logging
import re
from typing import Optional

import requests
from bs4 import BeautifulSoup

from ..config import REPORTS_DIR, sources
from ..transform import parse_fecha

log = logging.getLogger("reportes")
UA = {"User-Agent": "Dashboard-Mercado-Electrico-CL/1.0"}


def _periodo_desde_texto(texto: str) -> Optional[str]:
    f = parse_fecha(texto)
    return f[:7] if f else None


def listar_reportes() -> list[dict]:
    cfg = sources()["modulos"]["reportes_cne"]
    url = cfg["repositorio"]
    try:
        html = requests.get(url, headers=UA, timeout=45).text
    except Exception as exc:
        log.warning("No se pudo abrir el repositorio de reportes: %s", exc)
        return []

    soup = BeautifulSoup(html, "lxml")
    enlaces = [(a.get_text(" ", strip=True), a["href"])
               for a in soup.find_all("a", href=True)
               if a["href"].lower().endswith(".pdf")]

    encontrados: dict[str, dict] = {}
    for tipo in cfg["tipos"]:
        patron = re.compile(tipo["patron"])
        for texto, href in enlaces:
            blob = f"{texto} {href}"
            if not patron.search(blob):
                continue
            periodo = _periodo_desde_texto(blob)
            if not periodo:
                continue
            actual = encontrados.get(tipo["nombre"])
            if actual is None or periodo > actual["periodo"]:
                encontrados[tipo["nombre"]] = dict(
                    tipo=tipo["nombre"], titulo=texto or tipo["nombre"],
                    periodo=periodo, fecha_publicacion=f"{periodo}-01",
                    url=requests.compat.urljoin(url, href),
                    fuente="CNE · Energía Abierta — repositorio de reportes",
                )
    return list(encontrados.values())


def descargar_y_extraer(reporte: dict, extraer_tablas: bool = True) -> dict:
    """Descarga el PDF y, si se solicita, extrae tablas con pdfplumber."""
    try:
        contenido = requests.get(reporte["url"], headers=UA, timeout=90).content
    except Exception as exc:
        log.warning("Descarga de reporte falló: %s", exc)
        return reporte

    h = hashlib.sha256(contenido).hexdigest()
    destino = REPORTS_DIR / f"{reporte['tipo'].replace(' ', '_')}_{reporte['periodo']}.pdf"
    destino.write_bytes(contenido)
    reporte = {**reporte, "ruta_local": str(destino), "hash_archivo": h}

    if extraer_tablas:
        try:
            import json

            import pdfplumber

            tablas = []
            with pdfplumber.open(destino) as pdf:
                for page in pdf.pages[:25]:  # límite por rendimiento
                    for t in page.extract_tables() or []:
                        if t:
                            tablas.append(t)
            reporte["tablas_json"] = json.dumps(tablas[:50], ensure_ascii=False)
        except Exception as exc:
            log.warning("Extracción de tablas falló: %s", exc)
    return reporte
