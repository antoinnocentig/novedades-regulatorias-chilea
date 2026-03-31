/**
 * Scraper PDF Analytics — Descarga y analiza el último Reporte Mensual del Sector Energético (CNE)
 *
 * Fuente primaria: CNE — Reporte Mensual del Sector Energético
 *   https://www.cne.cl/estadisticas/energetica/electricidad/reporte-mensual-del-sector-energetico/
 *   Patrón PDF: https://www.cne.cl/wp-content/uploads/{YYYY}/{MM}/RMensual_v{YYYYMM}.pdf
 *
 * Análisis con IA:
 *   - Si ANTHROPIC_API_KEY está definida → usa Claude (claude-haiku) para extracción inteligente
 *   - Si no hay API key → usa extracción por regex (sin costo)
 *
 * Para obtener una API key GRATIS (créditos iniciales):
 *   https://console.anthropic.com/
 */

import * as cheerio from 'cheerio';

const CNE_LISTADO_URL =
  'https://www.cne.cl/estadisticas/energetica/electricidad/reporte-mensual-del-sector-energetico/';
const CNE_BASE = 'https://www.cne.cl';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; CEN-Dashboard/1.0)',
  Accept: 'text/html,application/pdf,*/*;q=0.8',
};

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface MetricasPDF {
  pdfUrl: string;
  mesPeriodo: string;                        // Ej: "Enero 2026"
  capacidadTotalMW: number | null;
  generacionTotalGWh: number | null;
  porcentajeRenovable: number | null;        // 0–100
  demandaTotalGWh: number | null;
  precioNudoMWhCLP: number | null;
  generacionPorTecnologia: {
    solar: number | null;
    eolica: number | null;
    hidro: number | null;
    termica: number | null;
    otros: number | null;
  };
  resumenIA: string | null;                  // Párrafo generado por Claude
  metodoExtraccion: 'ia' | 'regex';          // Qué método se usó
  textoExtraido: string;                     // Primeros 500 chars del PDF (debug)
}

export interface ResultadoPDFAnalytics {
  metricas: MetricasPDF | null;
  estado: {
    nombre: string;
    url: string;
    estado: 'ok' | 'error' | 'fallback';
    mensaje: string;
  };
}

// ─── 1. Encontrar el PDF más reciente ─────────────────────────────────────────

/**
 * Intenta encontrar el enlace al PDF más reciente en la página de listado del CNE.
 * Si no puede scrapearlo, construye la URL por patrón de fecha.
 */
async function encontrarUltimoPDF(): Promise<string | null> {
  // Intentar scrapear la página de listado
  try {
    const resp = await fetch(CNE_LISTADO_URL, {
      headers: HEADERS,
      signal: AbortSignal.timeout(12000),
    });
    if (resp.ok) {
      const html = await resp.text();
      const $ = cheerio.load(html);
      let pdfUrl: string | null = null;

      // Buscar links a PDFs de reportes mensuales (patrón: RMensual_v o reporte-mensual)
      $('a[href*=".pdf"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        if (
          href.match(/RMensual/i) ||
          href.match(/reporte.mensual/i) ||
          href.match(/rmensual/i)
        ) {
          pdfUrl = href.startsWith('http') ? href : `${CNE_BASE}${href}`;
          return false; // tomar el primero (más reciente en la lista)
        }
      });

      if (pdfUrl) return pdfUrl;
    }
  } catch {
    // continuar con fallback por patrón
  }

  // Fallback: construir URL por patrón de fecha (mes actual y anterior)
  const ahora = new Date();
  const candidatos: string[] = [];

  for (let delta = 0; delta <= 3; delta++) {
    const fecha = new Date(ahora.getFullYear(), ahora.getMonth() - delta, 1);
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    candidatos.push(
      `${CNE_BASE}/wp-content/uploads/${anio}/${mes}/RMensual_v${anio}${mes}.pdf`
    );
  }

  for (const url of candidatos) {
    try {
      const r = await fetch(url, {
        method: 'HEAD',
        headers: HEADERS,
        signal: AbortSignal.timeout(6000),
      });
      if (r.ok) return url;
    } catch {
      /* continuar */
    }
  }

  return null;
}

// ─── 2. Descargar y parsear el PDF ────────────────────────────────────────────

async function descargarYParsearPDF(pdfUrl: string): Promise<string> {
  const resp = await fetch(pdfUrl, {
    headers: { ...HEADERS, Accept: 'application/pdf' },
    signal: AbortSignal.timeout(30000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} al descargar ${pdfUrl}`);

  const buf = Buffer.from(await resp.arrayBuffer());
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require('pdf-parse') as (b: Buffer) => Promise<{ text: string }>;
  const { text } = await pdfParse(buf);
  return text;
}

// ─── 3a. Extracción por REGEX (sin costo, sin API key) ────────────────────────

function extraerConRegex(texto: string): Omit<MetricasPDF, 'pdfUrl' | 'metodoExtraccion' | 'textoExtraido' | 'resumenIA'> {
  const n = (s: string | undefined) =>
    s ? parseFloat(s.replace(/\./g, '').replace(',', '.')) : null;

  const buscar = (...patrones: RegExp[]): number | null => {
    for (const p of patrones) {
      const m = texto.match(p);
      if (m?.[1]) return n(m[1]);
    }
    return null;
  };

  // Período del reporte
  const meses: Record<string, string> = {
    enero:'Enero', febrero:'Febrero', marzo:'Marzo', abril:'Abril',
    mayo:'Mayo', junio:'Junio', julio:'Julio', agosto:'Agosto',
    septiembre:'Septiembre', octubre:'Octubre', noviembre:'Noviembre', diciembre:'Diciembre',
  };
  let mesPeriodo = 'Período no detectado';
  const mesMatch = texto.match(/(?:período|mes|informe)\s+(?:de\s+)?(\w+)\s+(\d{4})/i) ||
                   texto.match(/(\w+)\s+(\d{4})/i);
  if (mesMatch) {
    const mesNombre = meses[mesMatch[1].toLowerCase()] || mesMatch[1];
    mesPeriodo = `${mesNombre} ${mesMatch[2]}`;
  }

  // Capacidad instalada total (MW)
  const capacidadTotalMW = buscar(
    /capacidad\s+instalada\s+(?:total|neta)[^0-9]*([0-9][0-9.,]+)\s*MW/i,
    /capacidad\s+total[^0-9]*([0-9][0-9.,]+)\s*MW/i,
    /total\s+capacidad[^0-9]*([0-9][0-9.,]+)\s*MW/i,
    /([0-9][0-9.,]+)\s*MW\s+(?:de\s+)?capacidad\s+instalada/i,
  );

  // Generación total (GWh)
  const generacionTotalGWh = buscar(
    /generaci[oó]n\s+(?:total|bruta|neta)[^0-9]*([0-9][0-9.,]+)\s*GWh/i,
    /total\s+generaci[oó]n[^0-9]*([0-9][0-9.,]+)\s*GWh/i,
    /([0-9][0-9.,]+)\s*GWh\s+(?:de\s+)?generaci[oó]n/i,
  );

  // Porcentaje renovable (ERNC)
  const porcentajeRenovable = buscar(
    /ERNC[^0-9]*([0-9][0-9.,]+)\s*%/i,
    /renovable[^0-9]*([0-9][0-9.,]+)\s*%/i,
    /([0-9][0-9.,]+)\s*%\s+renovable/i,
    /([0-9][0-9.,]+)\s*%\s+ERNC/i,
  );

  // Demanda total (GWh)
  const demandaTotalGWh = buscar(
    /demanda\s+(?:total|energ[eé]a)[^0-9]*([0-9][0-9.,]+)\s*GWh/i,
    /consumo\s+energ[eé]tico[^0-9]*([0-9][0-9.,]+)\s*GWh/i,
    /([0-9][0-9.,]+)\s*GWh\s+(?:de\s+)?demanda/i,
  );

  // Precio nudo (CLP/MWh)
  const precioNudoMWhCLP = buscar(
    /precio\s+nudo[^0-9]*([0-9][0-9.,]+)\s*CLP/i,
    /precio\s+nudo[^0-9]*\$\s*([0-9][0-9.,]+)/i,
    /costo\s+marginal[^0-9]*([0-9][0-9.,]+)\s*CLP/i,
  );

  // Generación por tecnología (GWh)
  const solar  = buscar(/solar[^0-9]*([0-9][0-9.,]+)\s*GWh/i, /fotovoltai[ck][ao][^0-9]*([0-9][0-9.,]+)\s*GWh/i);
  const eolica = buscar(/e[oó]lic[ao][^0-9]*([0-9][0-9.,]+)\s*GWh/i);
  const hidro  = buscar(/hidr[aá]ulic[ao][^0-9]*([0-9][0-9.,]+)\s*GWh/i, /embalse[^0-9]*([0-9][0-9.,]+)\s*GWh/i);
  const termica = buscar(
    /t[eé]rmic[ao][^0-9]*([0-9][0-9.,]+)\s*GWh/i,
    /carb[oó]n[^0-9]*([0-9][0-9.,]+)\s*GWh/i,
  );

  return {
    mesPeriodo,
    capacidadTotalMW,
    generacionTotalGWh,
    porcentajeRenovable,
    demandaTotalGWh,
    precioNudoMWhCLP,
    generacionPorTecnologia: { solar, eolica, hidro, termica, otros: null },
  };
}

// ─── 3b. Extracción con Claude (IA) ───────────────────────────────────────────

interface ClaudeExtraction {
  mesPeriodo: string;
  capacidadTotalMW: number | null;
  generacionTotalGWh: number | null;
  porcentajeRenovable: number | null;
  demandaTotalGWh: number | null;
  precioNudoMWhCLP: number | null;
  solar_GWh: number | null;
  eolica_GWh: number | null;
  hidro_GWh: number | null;
  termica_GWh: number | null;
  resumen: string;
}

async function extraerConIA(texto: string): Promise<ClaudeExtraction | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  // Enviar los primeros ~6000 caracteres (suficiente para las métricas del resumen ejecutivo)
  const extracto = texto.slice(0, 6000);

  const prompt = `Eres un experto en el sector eléctrico chileno. Extrae las métricas clave del siguiente texto de un reporte mensual del sector energético de Chile (CNE).

TEXTO DEL PDF:
${extracto}

Devuelve ÚNICAMENTE un objeto JSON válido con esta estructura exacta (usa null si no encuentras el valor):
{
  "mesPeriodo": "Nombre del mes y año del reporte, ej: Enero 2026",
  "capacidadTotalMW": número o null,
  "generacionTotalGWh": número o null,
  "porcentajeRenovable": número entre 0 y 100 o null,
  "demandaTotalGWh": número o null,
  "precioNudoMWhCLP": número o null,
  "solar_GWh": número o null,
  "eolica_GWh": número o null,
  "hidro_GWh": número o null,
  "termica_GWh": número o null,
  "resumen": "Resumen ejecutivo de 2-3 oraciones en español destacando los hallazgos más relevantes del período"
}`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001', // modelo más rápido y económico
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) return null;

    const data = await resp.json() as { content: Array<{ text: string }> };
    const rawText = data.content[0]?.text ?? '';

    // Extraer JSON del texto (Claude puede añadir texto antes/después)
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]) as ClaudeExtraction;
  } catch {
    return null;
  }
}

// ─── 4. Función principal exportada ───────────────────────────────────────────

export async function scrapePDFAnalytics(): Promise<ResultadoPDFAnalytics> {
  const estadoBase = { nombre: 'PDF Analytics CNE', url: CNE_LISTADO_URL };

  // Paso 1: Encontrar el PDF más reciente
  let pdfUrl: string | null = null;
  try {
    pdfUrl = await encontrarUltimoPDF();
  } catch {
    /* continuar */
  }

  if (!pdfUrl) {
    return {
      metricas: null,
      estado: { ...estadoBase, estado: 'error', mensaje: 'No se encontró ningún PDF en el sitio del CNE' },
    };
  }

  // Paso 2: Descargar y parsear el PDF
  let textoPDF: string;
  try {
    textoPDF = await descargarYParsearPDF(pdfUrl);
  } catch (err) {
    return {
      metricas: null,
      estado: {
        ...estadoBase,
        url: pdfUrl,
        estado: 'error',
        mensaje: `Error al descargar/parsear el PDF: ${err instanceof Error ? err.message : String(err)}`,
      },
    };
  }

  // Paso 3: Intentar extracción con IA, caer en regex si no hay API key
  let metricas: MetricasPDF;
  const tieneAPIKey = !!process.env.ANTHROPIC_API_KEY;
  const iaResult = tieneAPIKey ? await extraerConIA(textoPDF) : null;

  if (iaResult) {
    metricas = {
      pdfUrl,
      mesPeriodo:           iaResult.mesPeriodo,
      capacidadTotalMW:     iaResult.capacidadTotalMW,
      generacionTotalGWh:   iaResult.generacionTotalGWh,
      porcentajeRenovable:  iaResult.porcentajeRenovable,
      demandaTotalGWh:      iaResult.demandaTotalGWh,
      precioNudoMWhCLP:     iaResult.precioNudoMWhCLP,
      generacionPorTecnologia: {
        solar:   iaResult.solar_GWh,
        eolica:  iaResult.eolica_GWh,
        hidro:   iaResult.hidro_GWh,
        termica: iaResult.termica_GWh,
        otros:   null,
      },
      resumenIA:         iaResult.resumen,
      metodoExtraccion:  'ia',
      textoExtraido:     textoPDF.slice(0, 500),
    };
  } else {
    const regexResult = extraerConRegex(textoPDF);
    metricas = {
      pdfUrl,
      ...regexResult,
      resumenIA:        null,
      metodoExtraccion: 'regex',
      textoExtraido:    textoPDF.slice(0, 500),
    };
  }

  return {
    metricas,
    estado: {
      ...estadoBase,
      url: pdfUrl,
      estado: 'ok',
      mensaje: `PDF descargado y analizado (${metricas.metodoExtraccion === 'ia' ? 'Claude IA' : 'Regex'}) — ${metricas.mesPeriodo}`,
    },
  };
}
