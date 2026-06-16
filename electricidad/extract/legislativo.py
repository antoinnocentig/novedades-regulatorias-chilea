"""Monitoreo legislativo: Senado y Cámara de Diputados (open data XML).

* Cámara de Diputadas y Diputados — WebServices Open Data (XML):
    .../WSLegislativo.asmx/retornarProyectosLeyXAnno?prmAnno=YYYY
* Senado — WS público de tramitación (XML):
    https://tramitacion.senado.cl/wspublico/tramitacion.php?boletin=NNNN

Se filtran los proyectos cuyo título contenga términos del sector energético
(config/sources.yaml -> modulos.legislativo.temas).
"""
from __future__ import annotations

import logging
import re
import unicodedata
from datetime import date

import requests
from bs4 import BeautifulSoup

from ..config import sources

log = logging.getLogger("legislativo")
UA = {"User-Agent": "Dashboard-Mercado-Electrico-CL/1.0"}


def _norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return s.lower()


def _tema(titulo: str, temas: list[str]) -> str | None:
    t = _norm(titulo)
    for tema in temas:
        if _norm(tema) in t:
            return tema
    # heurísticas adicionales
    if any(k in t for k in ("electric", "generacion", "energ")):
        return "energia"
    return None


def proyectos_camara(anios: list[int], temas: list[str]) -> list[dict]:
    cfg = sources()["modulos"]["legislativo"]["fuentes"]["camara"]
    out = []
    for anio in anios:
        try:
            r = requests.get(cfg["proyectos"], params={"prmAnno": anio},
                             headers=UA, timeout=60)
            r.raise_for_status()
        except Exception as exc:
            log.warning("Cámara %s falló: %s", anio, exc)
            continue
        soup = BeautifulSoup(r.content, "xml")
        for p in soup.find_all("ProyectoLey"):
            titulo = (p.find("Nombre").text if p.find("Nombre") else "")
            tema = _tema(titulo, temas)
            if not tema:
                continue
            boletin = p.find("NumeroBoletin").text if p.find("NumeroBoletin") else ""
            estado = p.find("Estado").text if p.find("Estado") else ""
            fecha = p.find("FechaIngreso").text if p.find("FechaIngreso") else ""
            out.append(dict(
                boletin=boletin.strip(), titulo=titulo.strip(), camara_origen="Cámara",
                estado=estado.strip(), comision="", urgencia="", tema=tema,
                fecha_ingreso=fecha[:10], ultimo_movimiento=estado.strip(),
                fecha_movimiento=fecha[:10],
                url=f"https://www.camara.cl/legislacion/ProyectosDeLey/proyectos_ley.aspx?prmBOLETIN={boletin.strip()}",
                fuente="Cámara de Diputadas y Diputados — Open Data",
            ))
    return out


def proyecto_senado(boletin: str) -> dict | None:
    cfg = sources()["modulos"]["legislativo"]["fuentes"]["senado"]
    try:
        r = requests.get(cfg["proyectos"], params={"boletin": boletin},
                         headers=UA, timeout=45)
        r.raise_for_status()
    except Exception as exc:
        log.warning("Senado %s falló: %s", boletin, exc)
        return None
    soup = BeautifulSoup(r.content, "xml")
    proy = soup.find("proyecto")
    if not proy:
        return None

    def g(tag):
        el = proy.find(tag)
        return el.text.strip() if el and el.text else ""

    return dict(
        boletin=boletin, titulo=g("descripcion"), camara_origen=g("camara_origen") or "Senado",
        estado=g("etapa") or g("estado"), comision="", urgencia=g("urgencia_actual"),
        fecha_ingreso=g("fecha_ingreso")[:10], ultimo_movimiento=g("etapa"),
        fecha_movimiento=date.today().isoformat(),
        url=f"https://www.senado.cl/appsenado/templates/tramitacion/index.php?boletin_ini={boletin}",
        fuente="Senado — WS público de tramitación",
    )


def extraer(anios: list[int] | None = None) -> list[dict]:
    """Punto de entrada: devuelve proyectos del sector energético."""
    temas = sources()["modulos"]["legislativo"]["temas"]
    anios = anios or [date.today().year, date.today().year - 1, date.today().year - 2]
    proyectos = proyectos_camara(anios, temas)
    # Enriquecer con detalle del Senado donde el boletín exista.
    for p in proyectos:
        if re.match(r"^\d+", p["boletin"]):
            extra = proyecto_senado(p["boletin"])
            if extra and extra.get("urgencia"):
                p["urgencia"] = extra["urgencia"]
                p["estado"] = extra["estado"] or p["estado"]
    return proyectos
