import { NextRequest, NextResponse } from 'next/server';
import { getCachedData, setCachedData, isCacheValid } from '@/lib/cache';
import { scrapePMGD } from '@/lib/scrapers/pmgd';
import { scrapeSSCC } from '@/lib/scrapers/sscc';
import { scrapeGeneracion } from '@/lib/scrapers/generacion';
import { scrapePotencia } from '@/lib/scrapers/potencia';
import type { DashboardData } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const forceRefresh = new URL(request.url).searchParams.get('refresh') === 'true';

    if (!forceRefresh) {
      const cached = await getCachedData();
      if (cached && isCacheValid(cached)) return NextResponse.json({ ...cached, fromCache: true });
    }

    const [pmgd, sscc, gen, pot] = await Promise.all([scrapePMGD(), scrapeSSCC(), scrapeGeneracion(), scrapePotencia()]);

    const data: DashboardData = {
      pmgdCapacidad: pmgd.capacidad,
      pmgdCompensaciones: pmgd.compensaciones,
      pmgdEstabilizacion: pmgd.estabilizacion,
      ssccPagos: sscc.pagos,
      ssccUnidades: sscc.unidades,
      generacion: gen.datos,
      potencia: pot.datos,
      ultimaActualizacion: new Date().toISOString(),
      estadoFuentes: [pmgd.estado, sscc.estado, gen.estado, pot.estado],
    };

    await setCachedData(data);
    return NextResponse.json({ ...data, fromCache: false });
  } catch (error) {
    console.error('[API /data]', error);
    return NextResponse.json({ error: 'Error al obtener datos del sistema eléctrico' }, { status: 500 });
  }
}
