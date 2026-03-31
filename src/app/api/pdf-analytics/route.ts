/**
 * GET /api/pdf-analytics
 *
 * Descarga el último Reporte Mensual del Sector Energético (CNE),
 * extrae métricas con IA (Claude) o regex, y las devuelve como JSON.
 *
 * Query params:
 *   ?refresh=true  → ignora caché y re-descarga el PDF
 *
 * Respuesta exitosa:
 * {
 *   metricas: { ... },
 *   estado: { nombre, url, estado, mensaje },
 *   generadoEn: "ISO timestamp",
 *   fromCache: boolean
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { scrapePDFAnalytics } from '@/lib/scrapers/pdfAnalytics';

export const dynamic = 'force-dynamic';
export const maxDuration = 90; // el PDF puede tardar en descargarse

// Caché en memoria simple (válida 6 horas)
interface CacheEntry {
  data: unknown;
  timestamp: number;
}
let memCache: CacheEntry | null = null;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 horas

export async function GET(request: NextRequest) {
  const forceRefresh = new URL(request.url).searchParams.get('refresh') === 'true';

  // Devolver desde caché si está vigente
  if (!forceRefresh && memCache && Date.now() - memCache.timestamp < CACHE_TTL_MS) {
    return NextResponse.json({ ...memCache.data, fromCache: true });
  }

  try {
    const resultado = await scrapePDFAnalytics();

    const respuesta = {
      metricas:    resultado.metricas,
      estado:      resultado.estado,
      generadoEn:  new Date().toISOString(),
      fromCache:   false,
    };

    // Guardar en caché solo si el scrape fue exitoso
    if (resultado.estado.estado === 'ok') {
      memCache = { data: respuesta, timestamp: Date.now() };
    }

    const httpStatus = resultado.estado.estado === 'error' ? 502 : 200;
    return NextResponse.json(respuesta, { status: httpStatus });

  } catch (error) {
    console.error('[API /pdf-analytics]', error);
    return NextResponse.json(
      {
        metricas:   null,
        estado:     { nombre: 'PDF Analytics CNE', url: '', estado: 'error', mensaje: 'Error interno del servidor' },
        generadoEn: new Date().toISOString(),
        fromCache:  false,
      },
      { status: 500 }
    );
  }
}
