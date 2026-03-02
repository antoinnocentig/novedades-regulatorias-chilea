'use client';

import { useState, useEffect, useCallback } from 'react';
import PMGDSection from './sections/PMGDSection';
import SSCCSection from './sections/SSCCSection';
import GeneracionSection from './sections/GeneracionSection';
import PotenciaSection from './sections/PotenciaSection';
import KPICard from './ui/KPICard';
import StatusBadge from './ui/StatusBadge';
import { formatCLP, formatGWh, formatMW } from '@/lib/utils';
import type { DashboardData } from '@/lib/types';

type TabId = 'pmgd' | 'sscc' | 'generacion' | 'potencia';

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'pmgd',       label: 'PMGD',                    emoji: '⚡' },
  { id: 'sscc',       label: 'Servicios Complementarios', emoji: '🔧' },
  { id: 'generacion', label: 'Generación',               emoji: '📊' },
  { id: 'potencia',   label: 'Potencia',                 emoji: '💡' },
];

function Skeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[...Array(4)].map((_,i)=><div key={i} className="skeleton h-28 rounded-xl"/>)}</div>
      <div className="skeleton h-64 rounded-xl"/>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="skeleton h-80 rounded-xl"/><div className="skeleton h-80 rounded-xl"/></div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('pmgd');
  const [refreshing, setRefreshing] = useState(false);
  const [fromCache, setFromCache] = useState(false);

  const fetchData = useCallback(async (forceRefresh = false) => {
    try {
      if (!data) setLoading(true);
      if (forceRefresh) setRefreshing(true);
      const resp = await fetch(forceRefresh ? '/api/data?refresh=true' : '/api/data');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json();
      setData(json);
      setFromCache(json.fromCache || false);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data]);

  useEffect(() => { fetchData(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const ult = data?.generacion?.[data.generacion.length - 1];
  const ultSSCC = data?.ssccPagos?.[data.ssccPagos.length - 1];
  const ultComp = data?.pmgdCompensaciones?.[data.pmgdCompensaciones.length - 1];

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                SEN
              </div>
              <div>
                <h1 className="text-base font-bold text-white leading-tight">
                  Sistema Eléctrico Nacional — Chile
                </h1>
                <p className="text-xs text-slate-500">
                  Datos: Coordinador Eléctrico Nacional (coordinador.cl) · Actualización mensual automática
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {data?.ultimaActualizacion && (
                <div className="text-xs text-slate-500 hidden sm:block">
                  {fromCache ? '📦 Caché · ' : '🔄 Actualizado · '}
                  {new Date(data.ultimaActualizacion).toLocaleDateString('es-CL', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                </div>
              )}
              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <span className={refreshing ? 'animate-spin inline-block' : ''}>↻</span>
                {refreshing ? 'Actualizando...' : 'Actualizar'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Estado de fuentes */}
        {data?.estadoFuentes && (
          <div className="flex flex-wrap gap-2">
            {data.estadoFuentes.map(f => <StatusBadge key={f.nombre} fuente={f}/>)}
          </div>
        )}

        {loading && !data ? <Skeleton/> : error ? (
          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-8 text-center">
            <div className="text-rose-400 text-lg mb-2">Error al cargar datos</div>
            <div className="text-slate-400 text-sm mb-4">{error}</div>
            <button onClick={()=>fetchData()} className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm transition-colors">Reintentar</button>
          </div>
        ) : data ? (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPICard titulo="Capacidad Instalada PMGD" valor={formatMW(data.pmgdCapacidad.totalMW)} subtitulo={`${data.pmgdCapacidad.cantidadProyectos.toLocaleString('es-CL')} proyectos`} icono={<span>⚡</span>} color="azul"/>
              <KPICard titulo="Costo Sistémico PMGD" valor={ultComp?formatCLP(ultComp.costoSistemicoCLP):'-'} subtitulo={ultComp?`${ultComp.mes} ${ultComp.anio}`:''} icono={<span>💰</span>} color="violeta"/>
              <KPICard titulo="Pagos SSCC Mensual" valor={ultSSCC?formatCLP(ultSSCC.totalCLP):'-'} subtitulo={ultSSCC?`${ultSSCC.mes} ${ultSSCC.anio}`:''} icono={<span>🔧</span>} color="amarillo"/>
              <KPICard titulo="Generación Total Mensual" valor={ult?formatGWh(ult.totalGWh):'-'} subtitulo={ult?`${ult.mes} ${ult.anio}`:''} icono={<span>📊</span>} color="verde"/>
            </div>

            {/* Tabs */}
            <div className="border-b border-slate-800">
              <nav className="flex gap-1 overflow-x-auto">
                {TABS.map(tab=>(
                  <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer ${activeTab===tab.id ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-600'}`}
                  >
                    <span>{tab.emoji}</span><span>{tab.label}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Contenido */}
            <div>
              {activeTab === 'pmgd'       && <PMGDSection capacidad={data.pmgdCapacidad} compensaciones={data.pmgdCompensaciones} estabilizacion={data.pmgdEstabilizacion}/>}
              {activeTab === 'sscc'       && <SSCCSection pagos={data.ssccPagos} unidades={data.ssccUnidades}/>}
              {activeTab === 'generacion' && <GeneracionSection generacion={data.generacion}/>}
              {activeTab === 'potencia'   && <PotenciaSection potencia={data.potencia}/>}
            </div>

            {/* Footer */}
            <footer className="border-t border-slate-800 pt-6 pb-4">
              <div className="text-xs text-slate-600 space-y-1">
                <div className="font-medium text-slate-500 mb-2">Fuentes de datos</div>
                <div>• Coordinador Eléctrico Nacional: coordinador.cl — Reportes PMGD, Balances SSCC, Potencia de Suficiencia</div>
                <div>• Energía Abierta: datos.energiaabierta.cl — Generación por tecnología</div>
                <div>• Actualización automática el día 5 de cada mes a las 06:00 UTC vía Vercel Cron</div>
                <div>• Balances definitivos SSCC y Potencia disponibles en PLABACOM para usuarios registrados del CEN</div>
              </div>
            </footer>
          </>
        ) : null}
      </main>
    </div>
  );
}
