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
  const [pmgd, sscc, gen, pot] = await Promise.all([scrapePMGD(), scrapeSSCC(), scrapeGeneracion(), scrapePotencia()]);

  const data: DashboardData = {
    pmgdCapacidad: pmgd.capacidad, pmgdCompensaciones: pmgd.compensaciones, pmgdEstabilizacion: pmgd.estabilizacion,
    ssccPagos: sscc.pagos, ssccUnidades: sscc.unidades, generacion: gen.datos, potencia: pot.datos,
    ultimaActualizacion: new Date().toISOString(),
    estadoFuentes: [pmgd.estado, sscc.estado, gen.estado, pot.estado],
  };

  await setCachedData(data);
  return NextResponse.json({ success: true, duracionSegundos: ((Date.now()-t0)/1000).toFixed(1), ultimaActualizacion: data.ultimaActualizacion, estadoFuentes: data.estadoFuentes });
}
