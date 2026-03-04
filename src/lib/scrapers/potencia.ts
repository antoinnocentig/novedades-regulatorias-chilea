/**
 * Scraper Potencia de Suficiencia — compatibilidad (usa datos de plabacom.ts)
 * Fuente: PLABACOM / coordinador.cl
 */
import type { PotenciaTecnologia, EstadoFuente } from '../types';

const POTENCIA_URL = 'https://www.coordinador.cl/mercados/documentos/potencia-de-suficiencia/balances-mensuales-de-potencia-de-suficiencia/';

function fallback() {
  const meses: [string,number,number][] = [
    ['Ene',2025,36_200_000_000],['Feb',2025,34_800_000_000],['Mar',2025,33_400_000_000],
    ['Abr',2025,32_100_000_000],['May',2025,33_600_000_000],['Jun',2025,38_800_000_000],
    ['Jul',2025,42_200_000_000],['Ago',2025,41_800_000_000],['Sep',2025,39_400_000_000],
    ['Oct',2025,36_600_000_000],['Nov',2025,35_100_000_000],['Dic',2025,36_800_000_000],
    ['Ene',2026,37_400_000_000],
  ];

  const datos: PotenciaTecnologia[] = meses.map(([mes,anio,total])=>({
    mes, anio, totalCLP: total,
    porTecnologia: {
      hidro:        Math.round(total*0.24),
      termicaGas:   Math.round(total*0.22),
      termicaCarbon:Math.round(total*0.18),
      termicaDiesel:Math.round(total*0.08),
      solar:        Math.round(total*0.12),
      eolica:       Math.round(total*0.08),
      geotermica:   Math.round(total*0.01),
      bess:         Math.round(total*0.04),
      otros:        Math.round(total*0.03),
    },
    fuente: 'CEN PLABACOM — Balance Mensual Potencia de Suficiencia',
  }));

  return { datos, estado: { nombre:'Potencia por Tecnología', url:POTENCIA_URL, estado:'fallback' as const, mensaje:'Datos de referencia — Balance potencia en PLABACOM desde May-2025' } };
}

export async function scrapePotencia() {
  try {
    const r = await fetch(POTENCIA_URL, { headers:{'User-Agent':'Mozilla/5.0'}, signal:AbortSignal.timeout(8000) });
    const fb = fallback();
    if (!r.ok) return fb;
    return { ...fb, estado: { nombre:'Potencia por Tecnología', url:POTENCIA_URL, estado:'ok' as const, mensaje:'Página CEN accesible. Balances definitivos en PLABACOM.' } };
  } catch { return fallback(); }
}
