"""Cliente para la API CKAN de Energía Abierta.

Energía Abierta (energiaabierta.cl) es un portal CKAN. Este cliente:
  * Busca datasets por texto (resiliente a cambios de ID).
  * Lista recursos y descarga los CSV del DataStore o del repositorio.
  * Cae con elegancia (devuelve None / DataFrame vacío) si no hay red.

Doc API CKAN: https://docs.ckan.org/en/latest/api/
"""
from __future__ import annotations

import io
import logging
from typing import Optional

import pandas as pd
import requests
from tenacity import retry, stop_after_attempt, wait_exponential

from .config import sources

log = logging.getLogger("ckan")


class CKANClient:
    def __init__(self) -> None:
        cfg = sources()["ckan"]
        self.bases = [cfg["base_url"], cfg.get("base_url_alt")]
        self.bases = [b for b in self.bases if b]
        self.timeout = cfg.get("timeout", 45)
        self.rows = cfg.get("rows_per_page", 1000)
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": cfg["user_agent"]})

    # -- núcleo HTTP ---------------------------------------------------------
    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=2, max=16),
           reraise=True)
    def _get(self, url: str, **params) -> requests.Response:
        r = self.session.get(url, params=params or None, timeout=self.timeout)
        r.raise_for_status()
        return r

    def _action(self, action: str, **params) -> Optional[dict]:
        """Invoca un action CKAN probando todos los hosts configurados."""
        for base in self.bases:
            url = f"{base.rstrip('/')}/api/3/action/{action}"
            try:
                data = self._get(url, **params).json()
                if data.get("success"):
                    return data["result"]
            except Exception as exc:  # red bloqueada, timeout, 4xx/5xx…
                log.warning("CKAN %s falló en %s: %s", action, base, exc)
        return None

    # -- API de alto nivel ---------------------------------------------------
    def package_search(self, query: str, rows: int = 20) -> list[dict]:
        res = self._action("package_search", q=query, rows=rows)
        return res.get("results", []) if res else []

    def datastore_search(self, resource_id: str, limit: Optional[int] = None) -> pd.DataFrame:
        """Pagina el DataStore y devuelve un DataFrame."""
        limit = limit or self.rows
        registros: list[dict] = []
        offset = 0
        while True:
            res = self._action(
                "datastore_search", resource_id=resource_id, limit=limit, offset=offset
            )
            if not res:
                break
            chunk = res.get("records", [])
            registros.extend(chunk)
            if len(chunk) < limit:
                break
            offset += limit
            if offset > 200_000:  # tope de seguridad
                break
        return pd.DataFrame(registros)

    def download_csv(self, url: str) -> pd.DataFrame:
        """Descarga un recurso CSV (probando separadores y codificaciones)."""
        try:
            raw = self._get(url).content
        except Exception as exc:
            log.warning("Descarga CSV falló %s: %s", url, exc)
            return pd.DataFrame()
        for sep in (",", ";", "\t"):
            for enc in ("utf-8", "latin-1"):
                try:
                    df = pd.read_csv(io.BytesIO(raw), sep=sep, encoding=enc)
                    if df.shape[1] > 1:
                        return df
                except Exception:
                    continue
        return pd.DataFrame()

    def find_dataset_csv(self, queries: list[str]) -> pd.DataFrame:
        """Busca el primer dataset que matchee y descarga su mejor recurso CSV.

        Estrategia: por cada término de búsqueda, recorre los datasets y sus
        recursos; prioriza recursos en DataStore (datastore_active) y formato
        CSV. Devuelve el primer DataFrame no vacío.
        """
        for q in queries:
            for pkg in self.package_search(q, rows=10):
                for rec in pkg.get("resources", []):
                    fmt = (rec.get("format") or "").lower()
                    if rec.get("datastore_active"):
                        df = self.datastore_search(rec["id"])
                        if not df.empty:
                            df.attrs["fuente"] = pkg.get("title", q)
                            return df
                    if fmt in {"csv", "xlsx"} and rec.get("url"):
                        df = self.download_csv(rec["url"])
                        if not df.empty:
                            df.attrs["fuente"] = pkg.get("title", q)
                            return df
        return pd.DataFrame()
