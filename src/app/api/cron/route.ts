/**
 * Cron mensual — GET /api/cron
 * Vercel Cron: día 5 de cada mes a las 06:00 UTC (vercel.json)
 */

import { NextRequest, NextResponse } from 'next/server';
import { setCachedData, invalidateCache } from '@/lib/cache';
import { scrapePMGD } from '@/lib/scrapers/pmgd';
import { scrapeSSCC } from '@/lib/scrapers/sscc';
import { scrapeGeneracion } from '@/lib/scrapers/generacion';
import { scrapePotencia } from '@/lib/scrapers/potencia';
import { scrapeCapacidad } from '@/lib/scrapers/capacidad';
import { scrapeAlmacenamiento } from '@/lib/scrapers/almacenamiento';
import { scrapeDemanda } from '@/lib/scrapers/demanda';
import { scrapePagosClientes } from '@/lib/scrapers/pagosClientes';
import { scrapePlabacom } from '@/lib/scrapers/plabacom';
import type { DashboardData } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && !isVercelCron && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const t0 = Date.now();
  await invalidateCache();
  const [pmgd, sscc, gen, pot, cap, alm, dem, pagos, plabacom] = await Promise.all([
    scrapePMGD(), scrapeSSCC(), scrapeGeneracion(), scrapePotencia(),
    scrapeCapacidad(), scrapeAlmacenamiento(), scrapeDemanda(),
    scrapePagosClientes(), scrapePlabacom(),
  ]);

  const data: DashboardData = {
    pmgdCapacidad: pmgd.capacidad,
    pmgdCompensaciones: pmgd.compensaciones,
    pmgdEstabilizacion: pmgd.estabilizacion,
    capacidadTecnologia: cap.tecnologia,
    capacidadRegion: cap.regiones,
    almacenamientoRegion: alm.regiones,
    almacenamientoEvolucion: alm.evolucion,
    generacion: gen.datos,
    demanda: dem.datos,
    pagosClientes: pagos.datos,
    ssccPagos: sscc.pagos,
    ssccUnidades: sscc.unidades,
    potencia: pot.datos,
    transferenciasEconomicas: plabacom.datos,
    ultimaActualizacion: new Date().toISOString(),
    estadoFuentes: [pmgd.estado, sscc.estado, gen.estado, pot.estado, cap.estado, alm.estado, dem.estado, pagos.estado, plabacom.estado],
  };

  await setCachedData(data);
  return NextResponse.json({
    success: true,
    duracionSegundos: ((Date.now()-t0)/1000).toFixed(1),
    ultimaActualizacion: data.ultimaActualizacion,
    estadoFuentes: data.estadoFuentes,
  });
}
