import { NextRequest, NextResponse } from 'next/server';
import { getCachedData, setCachedData, isCacheValid } from '@/lib/cache';
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
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const forceRefresh = new URL(request.url).searchParams.get('refresh') === 'true';

    if (!forceRefresh) {
      const cached = await getCachedData();
      if (cached && isCacheValid(cached)) return NextResponse.json({ ...cached, fromCache: true });
    }

    const [pmgd, sscc, gen, pot, cap, alm, dem, pagos, plabacom] = await Promise.all([
      scrapePMGD(),
      scrapeSSCC(),
      scrapeGeneracion(),
      scrapePotencia(),
      scrapeCapacidad(),
      scrapeAlmacenamiento(),
      scrapeDemanda(),
      scrapePagosClientes(),
      scrapePlabacom(),
    ]);

    const data: DashboardData = {
      pmgdCapacidad:        pmgd.capacidad,
      pmgdCompensaciones:   pmgd.compensaciones,
      pmgdEstabilizacion:   pmgd.estabilizacion,
      capacidadTecnologia:  cap.tecnologia,
      capacidadRegion:      cap.regiones,
      almacenamientoRegion: alm.regiones,
      almacenamientoEvolucion: alm.evolucion,
      generacion:           gen.datos,
      demanda:              dem.datos,
      pagosClientes:        pagos.datos,
      ssccPagos:            sscc.pagos,
      ssccUnidades:         sscc.unidades,
      potencia:             pot.datos,
      transferenciasEconomicas: plabacom.datos,
      ultimaActualizacion:  new Date().toISOString(),
      estadoFuentes: [
        pmgd.estado,
        cap.estado,
        alm.estado,
        gen.estado,
        dem.estado,
        pagos.estado,
        sscc.estado,
        pot.estado,
        plabacom.estado,
      ],
    };

    await setCachedData(data);
    return NextResponse.json({ ...data, fromCache: false });
  } catch (error) {
    console.error('[API /data]', error);
    return NextResponse.json({ error: 'Error al obtener datos del sistema eléctrico' }, { status: 500 });
  }
}
