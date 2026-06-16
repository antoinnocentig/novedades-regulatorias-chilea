"""Utilidades de exportación: CSV, Excel, PDF y PNG (de gráficos Plotly)."""
from __future__ import annotations

import io

import pandas as pd


def to_csv_bytes(df: pd.DataFrame) -> bytes:
    return df.to_csv(index=False).encode("utf-8-sig")


def to_excel_bytes(hojas: dict[str, pd.DataFrame]) -> bytes:
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="xlsxwriter") as writer:
        for nombre, df in hojas.items():
            df.to_excel(writer, sheet_name=nombre[:31], index=False)
    return buf.getvalue()


def fig_to_png_bytes(fig) -> bytes | None:
    """Exporta una figura Plotly a PNG (requiere kaleido)."""
    try:
        return fig.to_image(format="png", scale=2)
    except Exception:
        return None


def df_to_pdf_bytes(df: pd.DataFrame, titulo: str, max_filas: int = 40) -> bytes:
    """Genera un PDF tabular simple con reportlab."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4))
    estilos = getSampleStyleSheet()
    elementos = [Paragraph(titulo, estilos["Title"]), Spacer(1, 12)]

    df = df.head(max_filas).copy()
    datos = [list(df.columns)] + df.astype(str).values.tolist()
    tabla = Table(datos, repeatRows=1)
    tabla.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0b3d63")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 7),
        ("GRID", (0, 0), (-1, -1), 0.3, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#eef3f7")]),
    ]))
    elementos.append(tabla)
    doc.build(elementos)
    return buf.getvalue()
