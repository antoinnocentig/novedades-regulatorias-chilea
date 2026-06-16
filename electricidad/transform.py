"""Normalización de DataFrames heterogéneos al esquema interno."""
from __future__ import annotations

import re
import unicodedata
from typing import Optional

import pandas as pd

ERNC = {"solar", "eolica", "eólica", "mini-hidro", "minihidro", "biomasa",
        "biogas", "geotermia", "geotérmica"}

_MES = {
    "ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6, "jul": 7,
    "ago": 8, "sep": 9, "set": 9, "oct": 10, "nov": 11, "dic": 12,
}


def _strip(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s)).encode("ascii", "ignore").decode()
    return s.strip().lower()


def find_column(df: pd.DataFrame, candidatos: list[str]) -> Optional[str]:
    """Devuelve el nombre real de la primera columna que matchee un candidato."""
    norm = {_strip(c): c for c in df.columns}
    for cand in candidatos:
        c = _strip(cand)
        if c in norm:
            return norm[c]
    # match por subcadena
    for cand in candidatos:
        c = _strip(cand)
        for k, original in norm.items():
            if c in k:
                return original
    return None


def parse_fecha(valor) -> Optional[str]:
    """Convierte fechas/periodos variados a 'YYYY-MM-01'."""
    if valor is None or (isinstance(valor, float) and pd.isna(valor)):
        return None
    s = str(valor).strip().lower()
    # 'ene-2026', 'enero 2026', '2026-01', '2026/01', '202601'
    m = re.search(r"(20\d{2})[-/ ]?(\d{1,2})", s)
    if m:
        y, mo = int(m.group(1)), int(m.group(2))
        if 1 <= mo <= 12:
            return f"{y}-{mo:02d}-01"
    m = re.search(r"([a-z]{3})[a-z]*[-/ ]?(20\d{2})", s)
    if m and m.group(1)[:3] in _MES:
        return f"{int(m.group(2))}-{_MES[m.group(1)[:3]]:02d}-01"
    m = re.search(r"^(20\d{2})$", s)
    if m:
        return f"{m.group(1)}-01-01"
    return None


def es_ernc(tecnologia: str) -> bool:
    return _strip(tecnologia) in ERNC


def to_float(valor) -> float:
    try:
        s = str(valor).replace(".", "").replace(",", ".") if "," in str(valor) else str(valor)
        return float(s)
    except (TypeError, ValueError):
        return 0.0
