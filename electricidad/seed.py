"""Datos de respaldo (seed) realistas para el mercado eléctrico chileno.

Cuando la extracción en vivo no está disponible (sin red / portal caído), el
dashboard se siembra con series sintéticas coherentes y proyectos reales, de
modo que SIEMPRE renderiza. Las cifras ancla provienen de fuentes públicas
verificadas (CNE Reporte Mensual, Boletín Generadoras de Chile, Informe PMGD
del Coordinador, SEA). Las filas sembradas se marcan con fuente "SEED ...".

Cambiar a datos en vivo no requiere tocar la app: el pipeline ETL reemplaza
estas filas en cuanto el portal CKAN responde.
"""
from __future__ import annotations

import math
import random
from datetime import date

random.seed(42)

FUENTE = "SEED · ancla CNE/CEN/SEA (datos demostrativos hasta extracción en vivo)"

# Clasificación ERNC según definición chilena (mini-hidro <=20 MW es ERNC;
# hidro embalse/pasada de gran tamaño NO se contabiliza como ERNC).
ERNC = {"Solar", "Eólica", "Mini-hidro", "Biomasa", "Geotermia"}

# Capacidad nacional por tecnología: (MW 2018, MW 2026) para interpolar.
TECH = {
    "Solar":        (2100, 11800),
    "Eólica":       (1500, 5600),
    "Hidro embalse":(3400, 3458),
    "Hidro pasada": (3300, 3362),
    "Mini-hidro":   (480, 661),
    "Gas":          (5000, 4858),
    "Carbón":       (4800, 2812),
    "Diésel":       (3000, 2747),
    "Biomasa":      (430, 521),
    "Geotermia":    (48, 84),
}

# Participación regional aproximada (suma ~1.0) — Norte concentra solar.
REGIONES = {
    "Antofagasta":   0.26, "Atacama": 0.14, "Biobío": 0.11, "Valparaíso": 0.09,
    "Tarapacá":      0.06, "Maule":   0.07, "O'Higgins": 0.06, "Metropolitana": 0.06,
    "Coquimbo":      0.05, "Los Lagos": 0.04, "Araucanía": 0.03, "Ñuble": 0.03,
}

# Sesgo tecnológico por región (peso relativo de cada tecnología).
SESGO = {
    "Antofagasta":   {"Solar": 3.0, "Gas": 1.5, "Carbón": 1.2, "Eólica": 0.6},
    "Atacama":       {"Solar": 3.2, "Eólica": 1.4, "Carbón": 0.8},
    "Tarapacá":      {"Solar": 3.0, "Carbón": 0.6},
    "Coquimbo":      {"Eólica": 2.6, "Solar": 1.2},
    "Biobío":        {"Hidro embalse": 2.0, "Hidro pasada": 2.0, "Carbón": 1.8, "Biomasa": 2.5},
    "Maule":         {"Hidro embalse": 2.4, "Hidro pasada": 2.2, "Mini-hidro": 2.0},
    "O'Higgins":     {"Hidro pasada": 2.0, "Solar": 1.2},
    "Valparaíso":    {"Eólica": 1.8, "Gas": 1.6, "Carbón": 1.2},
    "Metropolitana": {"Gas": 2.0, "Diésel": 1.5, "Solar": 0.8},
    "Los Lagos":     {"Hidro pasada": 2.2, "Eólica": 1.6, "Biomasa": 1.4},
    "Araucanía":     {"Hidro pasada": 1.8, "Eólica": 1.4, "Biomasa": 1.4},
    "Ñuble":         {"Hidro pasada": 1.6, "Solar": 1.2, "Biomasa": 1.4},
}

# Empresas representativas por tecnología (para filtros por empresa).
EMPRESAS = {
    "Solar":  ["Atlas Renewable", "Sonnedix", "Enel Green Power", "Grenergy", "Colbún"],
    "Eólica": ["Enel Green Power", "AES Andes", "Mainstream", "Engie", "Acciona"],
    "Gas":    ["Colbún", "Engie", "AES Andes"],
    "Carbón": ["AES Andes", "Engie", "Enel Generación"],
    "Diésel": ["Engie", "Colbún", "Enel Generación"],
    "Hidro embalse": ["Enel Generación", "Colbún", "Statkraft"],
    "Hidro pasada":  ["Statkraft", "Colbún", "Enel Generación", "Pacific Hydro"],
    "Mini-hidro":    ["Statkraft", "RP Global", "Pacific Hydro"],
    "Biomasa": ["Arauco", "CMPC", "Energía León"],
    "Geotermia": ["Cerro Pabellón (ENEL/ENAP)"],
}

ANIO_INI = 2018
MESES = [(y, m) for y in range(ANIO_INI, 2027) for m in range(1, 13)
         if not (y == 2026 and m > 5)]


def _interp(tech: str, idx: int, total: int) -> float:
    a, b = TECH[tech]
    # Curva en S suave + ruido leve para realismo.
    t = idx / max(total - 1, 1)
    s = 1 / (1 + math.exp(-6 * (t - 0.5)))
    base = a + (b - a) * s
    return round(base * random.uniform(0.99, 1.01), 1)


def _factor_planta(tech: str, mes: int) -> float:
    """Factor de planta mensual aproximado (con estacionalidad)."""
    estacion = {
        "Solar":  0.27 + 0.07 * math.cos((mes - 1) / 12 * 2 * math.pi),   # más en verano (S)
        "Eólica": 0.34 + 0.05 * math.cos((mes - 6) / 12 * 2 * math.pi),
        "Hidro embalse": 0.45 + 0.10 * math.cos((mes - 12) / 12 * 2 * math.pi),
        "Hidro pasada":  0.50 + 0.15 * math.cos((mes - 11) / 12 * 2 * math.pi),
        "Mini-hidro":    0.50 + 0.12 * math.cos((mes - 11) / 12 * 2 * math.pi),
        "Gas":    0.45, "Carbón": 0.62, "Diésel": 0.06,
        "Biomasa": 0.55, "Geotermia": 0.85,
    }
    return max(0.03, estacion.get(tech, 0.4))


def _regiones_para(tech: str) -> list[tuple[str, float]]:
    pesos = []
    for reg, base in REGIONES.items():
        w = base * SESGO.get(reg, {}).get(tech, 1.0)
        pesos.append((reg, w))
    s = sum(w for _, w in pesos)
    return [(r, w / s) for r, w in pesos]


def capacidad_rows() -> list[dict]:
    rows = []
    total = len(MESES)
    for idx, (y, m) in enumerate(MESES):
        fecha = f"{y}-{m:02d}-01"
        for tech in TECH:
            nac = _interp(tech, idx, total)
            for reg, share in _regiones_para(tech):
                mw = round(nac * share, 1)
                if mw < 0.5:
                    continue
                empresa = random.choice(EMPRESAS.get(tech, ["Varias"]))
                rows.append(dict(
                    fecha=fecha, region=reg, tecnologia=tech, combustible=tech,
                    empresa=empresa, potencia_mw=mw, es_ernc=tech in ERNC,
                    fuente=FUENTE,
                ))
    return rows


def generacion_rows() -> list[dict]:
    rows = []
    total = len(MESES)
    horas_mes = 730
    for idx, (y, m) in enumerate(MESES):
        fecha = f"{y}-{m:02d}-01"
        for tech in TECH:
            nac_mw = _interp(tech, idx, total)
            fp = _factor_planta(tech, m)
            gwh_nac = nac_mw * horas_mes * fp / 1000.0
            for reg, share in _regiones_para(tech):
                gwh = round(gwh_nac * share, 2)
                if gwh < 0.05:
                    continue
                rows.append(dict(
                    fecha=fecha, region=reg, tecnologia=tech, empresa="",
                    energia_gwh=gwh, es_ernc=tech in ERNC, fuente=FUENTE,
                ))
    return rows


def demanda_rows() -> list[dict]:
    rows = []
    total = len(MESES)
    sectores = {"Minería": 0.33, "Industrial": 0.27, "Comercial": 0.18,
                "Residencial": 0.17, "Otros": 0.05}
    for idx, (y, m) in enumerate(MESES):
        fecha = f"{y}-{m:02d}-01"
        # Demanda nacional crece ~2.5%/año desde ~6.300 GWh/mes.
        base = 6300 * (1.025 ** (idx / 12))
        estacional = 1 + 0.04 * math.cos((m - 7) / 12 * 2 * math.pi)
        total_gwh = base * estacional
        # punta (MW) ≈ energía mensual / horas / factor de carga 0.72
        punta_mw = total_gwh * 1000 / 730 / 0.72
        for sector, sh in sectores.items():
            rows.append(dict(
                fecha=fecha, region="Nacional", sector=sector,
                demanda_gwh=round(total_gwh * sh, 1),
                demanda_maxima_mw=round(punta_mw * sh, 1), fuente=FUENTE,
            ))
    return rows


# ── PMGD (proyectos individuales, con coordenadas para el mapa) ──────────────
_PMGD_COMUNAS = {
    "Metropolitana": [("Til Til", -33.08, -70.92), ("Melipilla", -33.69, -71.21)],
    "Maule":         [("Linares", -35.85, -71.60), ("Parral", -36.14, -71.83)],
    "O'Higgins":     [("Rancagua", -34.17, -70.74), ("San Fernando", -34.58, -70.99)],
    "Coquimbo":      [("Ovalle", -30.60, -71.20), ("Illapel", -31.63, -71.17)],
    "Biobío":        [("Los Ángeles", -37.47, -72.35), ("Chillán Viejo", -36.62, -72.13)],
    "Valparaíso":    [("La Ligua", -32.45, -71.23), ("San Felipe", -32.75, -70.72)],
    "Antofagasta":   [("Calama", -22.46, -68.93)],
    "Atacama":       [("Copiapó", -27.37, -70.33), ("Vallenar", -28.57, -70.76)],
    "Araucanía":     [("Temuco", -38.74, -72.59)],
    "Los Lagos":     [("Osorno", -40.57, -73.13)],
}
_PMGD_TECH = (["Solar"] * 16 + ["Eólica"] * 2 + ["Mini-hidro"] * 1 + ["Biomasa"] * 1)


def pmgd_rows() -> list[dict]:
    rows = []
    n = 0
    for region, comunas in _PMGD_COMUNAS.items():
        for comuna, lat, lon in comunas:
            for _ in range(random.randint(6, 12)):
                n += 1
                tech = random.choice(_PMGD_TECH)
                estado = random.choices(
                    ["Operación", "Construcción", "Pruebas"], weights=[0.7, 0.22, 0.08])[0]
                pot = round(random.uniform(1.5, 9.0), 2)  # PMGD <= 9 MW
                rows.append(dict(
                    nombre=f"PMGD {tech} {comuna} {n:03d}",
                    region=region, comuna=comuna, tecnologia=tech, potencia_mw=pot,
                    estado=estado,
                    lat=round(lat + random.uniform(-0.15, 0.15), 4),
                    lon=round(lon + random.uniform(-0.15, 0.15), 4),
                    fecha_operacion=f"{random.randint(2019, 2026)}-{random.randint(1,12):02d}-01",
                    fuente=FUENTE,
                ))
    return rows


# ── Almacenamiento BESS (proyectos reales/representativos) ───────────────────
def almacenamiento_rows() -> list[dict]:
    proyectos = [
        ("BESS Andes Solar (AES)",      "Antofagasta", 112, 560, "Operación",   "AES Andes"),
        ("BESS Coya (Engie)",           "Antofagasta", 139, 638, "Operación",   "Engie"),
        ("BESS Tamarugal",              "Tarapacá",    200, 800, "Construcción", "Grenergy"),
        ("Oasis de Atacama (Grenergy)", "Atacama",     350, 1750, "Construcción","Grenergy"),
        ("BESS PV Salar (Colbún)",      "Antofagasta",  9,  40, "Operación",    "Colbún"),
        ("BESS Don Héctor",             "Atacama",     120, 480, "Evaluación",  "Innergex"),
        ("BESS Likana (Atlas)",         "Antofagasta", 200, 1200, "Aprobado",   "Atlas Renewable"),
        ("BESS Cumbre (Sonnedix)",      "Coquimbo",     80, 320, "Aprobado",    "Sonnedix"),
        ("BESS Lagunas",                "Tarapacá",     50, 250, "Operación",   "Enel Green Power"),
        ("BESS Sauce (Statkraft)",      "Valparaíso",   70, 280, "Evaluación",  "Statkraft"),
        ("BESS Capricornio",            "Antofagasta", 180, 720, "Construcción","Engie"),
        ("BESS Quillagua",              "Antofagasta", 220, 880, "Evaluación",  "TotalEnergies"),
    ]
    out = []
    for nombre, region, mw, mwh, estado, dueno in proyectos:
        out.append(dict(
            nombre=nombre, region=region, tecnologia="BESS", potencia_mw=mw,
            energia_mwh=mwh, estado=estado, propietario=dueno,
            fecha=f"2025-{random.randint(1,12):02d}-01", fuente=FUENTE,
        ))
    return out


# ── Reportes CNE (entradas representativas del repositorio) ──────────────────
def reportes_rows() -> list[dict]:
    base = "http://energiaabierta.cl/reportes/"
    tipos = [
        "Reporte Mensual Sector Energético",
        "Reporte Mensual ERNC",
        "Reporte Financiero del Sector Energético",
    ]
    out = []
    hoy = date(2026, 6, 1)
    for tipo in tipos:
        for k in range(6):  # últimos 6 periodos
            y = hoy.year if hoy.month - k > 0 else hoy.year - 1
            mm = (hoy.month - k - 1) % 12 + 1
            periodo = f"{y}-{mm:02d}"
            out.append(dict(
                tipo=tipo, titulo=f"{tipo} {periodo}", periodo=periodo,
                fecha_publicacion=f"{periodo}-15", url=f"{base}#{tipo}-{periodo}",
                fuente=FUENTE,
            ))
    out.append(dict(
        tipo="Anuario Estadístico de Energía", titulo="Anuario Estadístico 2024",
        periodo="2024-12", fecha_publicacion="2025-06-30", url=base, fuente=FUENTE,
    ))
    return out


# ── Proyectos de ley (boletines reales del sector energético) ────────────────
def proyectos_ley_rows() -> list[dict]:
    items = [
        ("16294-08", "Transición energética: habilita y promueve almacenamiento, "
         "PMGD y nueva transmisión", "Senado", "Primer trámite constitucional",
         "Minería y Energía", "Suma", "almacenamiento", "2024-08-13",
         "Despachado de comisión, pasa a Sala", "2026-05-20"),
        ("15819-08", "Promueve el desarrollo del hidrógeno verde y deroga barreras",
         "Cámara", "Segundo trámite constitucional", "Minería y Energía", "Simple",
         "hidrogeno verde", "2023-05-09", "Indicaciones del Ejecutivo", "2026-04-30"),
        ("15054-33", "Sobre desalinización de agua de mar (uso multipropósito)",
         "Senado", "Segundo trámite constitucional", "Recursos Hídricos", "Suma",
         "desalinizacion", "2022-04-05", "Aprobado en general por la Sala", "2026-05-08"),
        ("16078-08", "Moderniza la permisología sectorial para proyectos de energía",
         "Cámara", "Primer trámite constitucional", "Economía", "Discusión inmediata",
         "permisologia", "2024-04-23", "En votación particular", "2026-06-02"),
        ("14731-08", "Perfecciona la regulación de la transmisión eléctrica",
         "Senado", "Primer trámite constitucional", "Minería y Energía", "Simple",
         "transmision", "2021-11-30", "En estudio en comisión", "2026-03-18"),
        ("15943-08", "Tarifas eléctricas y subsidio para clientes residenciales",
         "Cámara", "Tramitación terminada", "Minería y Energía", "Sin urgencia",
         "mercado electrico", "2023-07-04", "Publicada como Ley", "2025-05-30"),
        ("16553-08", "Régimen de PMGD y estabilización de precios",
         "Senado", "Primer trámite constitucional", "Minería y Energía", "Simple",
         "PMGD", "2025-01-15", "Ingresado, cuenta en Sala", "2026-02-12"),
        ("16210-09", "Distribución eléctrica: portabilidad y calidad de servicio",
         "Cámara", "Primer trámite constitucional", "Minería y Energía", "Suma",
         "distribucion", "2024-07-02", "Audiencias públicas", "2026-05-14"),
    ]
    cols = ("boletin", "titulo", "camara_origen", "estado", "comision", "urgencia",
            "tema", "fecha_ingreso", "ultimo_movimiento", "fecha_movimiento")
    out = []
    for it in items:
        d = dict(zip(cols, it))
        d["url"] = f"https://www.senado.cl/appsenado/templates/tramitacion/index.php?boletin_ini={d['boletin']}"
        d["fuente"] = "SEED · boletines Congreso Nacional (Senado/Cámara)"
        out.append(d)
    return out
