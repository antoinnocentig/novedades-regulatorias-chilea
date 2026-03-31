'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import SectionCard from '@/components/ui/SectionCard';
import { formatMW, formatGWh, COLORES_TECNOLOGIA } from '@/lib/utils';
import type { InfotecnicaStats } from '@/lib/types';

// ── Colores de segmento ─────────────────────────────────────────
const COLOR_PMGD    = '#6366F1'; // indigo
const COLOR_PMG     = '#22C55E'; // green
const COLOR_NINGUNO = '#94A3B8'; // slate

const SEGMENTO_LABEL: Record<string, string> = {
  PMGD:    'PMGD',
  PMG:     'PMG',
  Ninguno: 'Resto SEN',
};

// ── Tooltip compartido ─────────────────────────────────────────
function TTCapacidad({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-lg min-w-[200px]">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {[...payload].reverse().map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4 text-gray-500 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.fill }} />
            <span>{SEGMENTO_LABEL[p.name] ?? p.name}:</span>
          </div>
          <div className="flex gap-2 font-medium text-gray-800">
            <span>{formatMW(p.value)}</span>
            {total > 0 && <span className="text-gray-400">({(p.value / total * 100).toFixed(1)}%)</span>}
          </div>
        </div>
      ))}
      <div className="border-t border-gray-100 mt-1.5 pt-1.5 flex justify-between font-semibold text-gray-700">
        <span>Total:</span>
        <span>{formatMW(total)}</span>
      </div>
    </div>
  );
}

function TTGeneracion({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-lg min-w-[200px]">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {[...payload].reverse().map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4 text-gray-500 mb-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.fill }} />
            <span>{SEGMENTO_LABEL[p.name] ?? p.name}:</span>
          </div>
          <div className="flex gap-2 font-medium text-gray-800">
            <span>{formatGWh(p.value)}</span>
            {total > 0 && <span className="text-gray-400">({(p.value / total * 100).toFixed(1)}%)</span>}
          </div>
        </div>
      ))}
      <div className="border-t border-gray-100 mt-1.5 pt-1.5 flex justify-between font-semibold text-gray-700">
        <span>Total:</span>
        <span>{formatGWh(total)}</span>
      </div>
    </div>
  );
}

function TTBarras({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-lg">
      <p className="font-semibold text-gray-800 mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="text-gray-600">
          <span>{p.name === 'cantidad' ? 'Barras' : 'Líneas'}: </span>
          <span className="font-bold text-gray-800">{p.value.toLocaleString('es-CL')}</span>
          {p.name === 'kmTotales' && <span className="text-gray-400"> km</span>}
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────
export default function InfotecnicaSection({ stats }: { stats: InfotecnicaStats }) {
  const cap = stats.capacidadPorSegmento;
  const gen = stats.generacionPorSegmento;

  // Totales por segmento (capacidad)
  const totalPMGD    = cap.reduce((s, r) => s + r.pmgd,    0);
  const totalPMG     = cap.reduce((s, r) => s + r.pmg,     0);
  const totalNinguno = cap.reduce((s, r) => s + r.ninguno, 0);
  const totalSEN     = totalPMGD + totalPMG + totalNinguno;

  // Totales por segmento (generación)
  const genPMGD    = gen.reduce((s, r) => s + r.pmgd,    0);
  const genPMG     = gen.reduce((s, r) => s + r.pmg,     0);
  const genNinguno = gen.reduce((s, r) => s + r.ninguno, 0);
  const genTotal   = genPMGD + genPMG + genNinguno;

  // Datos para gráfico de capacidad por tecnología
  const capChartData = cap
    .filter(r => r.total > 5)
    .sort((a, b) => b.total - a.total)
    .map(r => ({
      name: r.nombreTecnologia,
      PMGD: r.pmgd,
      PMG: r.pmg,
      Ninguno: r.ninguno,
      total: r.total,
    }));

  // Datos para gráfico de generación por tecnología
  const genChartData = gen
    .filter(r => r.total > 50)
    .sort((a, b) => b.total - a.total)
    .map(r => ({
      name: r.nombreTecnologia,
      PMGD: r.pmgd,
      PMG: r.pmg,
      Ninguno: r.ninguno,
      total: r.total,
    }));

  // Pie: mix de capacidad por segmento
  const pieSeg = [
    { name: 'PMGD',       value: totalPMGD,    color: COLOR_PMGD },
    { name: 'PMG',        value: totalPMG,     color: COLOR_PMG },
    { name: 'Resto SEN',  value: totalNinguno, color: COLOR_NINGUNO },
  ];

  // Pie: mix generación por segmento
  const pieGenSeg = [
    { name: 'PMGD',       value: genPMGD,    color: COLOR_PMGD },
    { name: 'PMG',        value: genPMG,     color: COLOR_PMG },
    { name: 'Resto SEN',  value: genNinguno, color: COLOR_NINGUNO },
  ];

  // Pie: capacidad PMGD por tecnología
  const piePMGDTech = cap
    .filter(r => r.pmgd > 0)
    .map(r => ({ name: r.nombreTecnologia, value: r.pmgd, color: COLORES_TECNOLOGIA[r.tecnologia] || '#6B7280' }));

  // Pie: capacidad PMG por tecnología
  const piePMGTech = cap
    .filter(r => r.pmg > 0)
    .map(r => ({ name: r.nombreTecnologia, value: r.pmg, color: COLORES_TECNOLOGIA[r.tecnologia] || '#6B7280' }));

  // Barras por tensión
  const barrasData = stats.barrasPorTension.map(b => ({ name: b.tension, cantidad: b.cantidad }));

  // Líneas por tensión
  const lineasData = stats.lineasPorTension.map(l => ({
    name: l.tension,
    'Tramos': l.cantidad,
    'Longitud (km)': l.kmTotales,
  }));

  const renderPieLabel = ({ cx, cy, midAngle, outerRadius, percent, name }: any) => {
    if ((percent ?? 0) < 0.04) return null;
    const R = Math.PI / 180;
    const r = outerRadius + 20;
    const x = cx + r * Math.cos(-midAngle * R);
    const y = cy + r * Math.sin(-midAngle * R);
    return (
      <text x={x} y={y} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central"
        style={{ fontSize: 10, fill: '#374151', fontWeight: 600 }}>
        {`${((percent ?? 0) * 100).toFixed(1)}%`}
      </text>
    );
  };

  const FUENTE = 'Infotécnica CEN · Informe PMGD Ene-2025 · Informe Anual 2024';

  return (
    <div className="space-y-4">

      {/* ── KPIs ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: 'Centrales en el SEN', val: stats.totalCentrales.toLocaleString('es-CL'), color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
          { label: 'Unidades Generadoras', val: stats.totalUG.toLocaleString('es-CL'), color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-200' },
          { label: 'UG PMGD', val: stats.totalUGPMGD.toLocaleString('es-CL'), color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200' },
          { label: 'Barras del Sistema', val: stats.totalBarras.toLocaleString('es-CL'), color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
          { label: 'Tramos de Línea', val: stats.totalLineas.toLocaleString('es-CL'), color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
        ].map(k => (
          <div key={k.label} className={`rounded-lg ${k.bg} border ${k.border} p-4 shadow-sm`}>
            <div className="text-xs text-gray-500 mb-1 leading-tight">{k.label}</div>
            <div className={`text-xl font-bold ${k.color}`}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* ── Capacidad por Tecnología y Segmento ───────────── */}
      <SectionCard
        titulo="Capacidad Instalada por Tecnología y Segmento"
        subtitulo={`Al 31-Dic-2024 — Total SEN: ${formatMW(totalSEN)}`}
        fuente={FUENTE}
      >
        <div className="flex flex-wrap gap-4 mb-3 text-xs">
          {[
            { color: COLOR_PMGD,    label: `PMGD — ${formatMW(totalPMGD)} (${(totalPMGD/totalSEN*100).toFixed(1)}%)` },
            { color: COLOR_PMG,     label: `PMG — ${formatMW(totalPMG)} (${(totalPMG/totalSEN*100).toFixed(1)}%)` },
            { color: COLOR_NINGUNO, label: `Resto SEN — ${formatMW(totalNinguno)} (${(totalNinguno/totalSEN*100).toFixed(1)}%)` },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: l.color }} />
              <span className="text-gray-600">{l.label}</span>
            </div>
          ))}
        </div>
        <div className="h-[340px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={capChartData} layout="vertical" margin={{ left: 10, right: 24, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
              <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)} GW`} style={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={110} style={{ fontSize: 11 }} tick={{ fill: '#4B5563' }} />
              <Tooltip content={<TTCapacidad />} />
              <Bar dataKey="Ninguno" stackId="a" fill={COLOR_NINGUNO} radius={[0, 0, 0, 0]} />
              <Bar dataKey="PMG"     stackId="a" fill={COLOR_PMG}     radius={[0, 0, 0, 0]} />
              <Bar dataKey="PMGD"    stackId="a" fill={COLOR_PMGD}    radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* ── Generación por Tecnología y Segmento ──────────── */}
      <SectionCard
        titulo="Generación por Tecnología y Segmento (2024)"
        subtitulo={`Total SEN 2024: ${formatGWh(genTotal)} — PMGD: ${formatGWh(genPMGD)} (${(genPMGD/genTotal*100).toFixed(1)}%)`}
        fuente="CEN Informe Anual 2024 · Informe PMGD Dic-2024 · Informe Monitoreo 2024"
      >
        <div className="flex flex-wrap gap-4 mb-3 text-xs">
          {[
            { color: COLOR_PMGD,    label: `PMGD — ${formatGWh(genPMGD)} (${(genPMGD/genTotal*100).toFixed(1)}%)` },
            { color: COLOR_PMG,     label: `PMG — ${formatGWh(genPMG)} (${(genPMG/genTotal*100).toFixed(1)}%)` },
            { color: COLOR_NINGUNO, label: `Resto SEN — ${formatGWh(genNinguno)} (${(genNinguno/genTotal*100).toFixed(1)}%)` },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: l.color }} />
              <span className="text-gray-600">{l.label}</span>
            </div>
          ))}
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={genChartData} layout="vertical" margin={{ left: 10, right: 24, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
              <XAxis type="number" tickFormatter={v => `${(v/1000).toFixed(0)} TWh`} style={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={110} style={{ fontSize: 11 }} tick={{ fill: '#4B5563' }} />
              <Tooltip content={<TTGeneracion />} />
              <Bar dataKey="Ninguno" stackId="a" fill={COLOR_NINGUNO} />
              <Bar dataKey="PMG"     stackId="a" fill={COLOR_PMG} />
              <Bar dataKey="PMGD"    stackId="a" fill={COLOR_PMGD} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* ── Mix Capacidad/Generación por Segmento + Detalle PMGD/PMG ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Mix capacidad por segmento */}
        <SectionCard titulo="Mix Capacidad por Segmento" subtitulo={`Total: ${formatMW(totalSEN)}`} fuente={FUENTE}>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieSeg} cx="50%" cy="50%" innerRadius={50} outerRadius={82} paddingAngle={3} dataKey="value"
                  label={renderPieLabel} labelLine={false}>
                  {pieSeg.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0];
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow">
                      <p className="font-semibold">{d.name}</p>
                      <p>{formatMW(d.value as number)}</p>
                    </div>
                  );
                }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Mix generación por segmento */}
        <SectionCard titulo="Mix Generación por Segmento (2024)" subtitulo={`Total: ${formatGWh(genTotal)}`} fuente="CEN Informe Anual 2024">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieGenSeg} cx="50%" cy="50%" innerRadius={50} outerRadius={82} paddingAngle={3} dataKey="value"
                  label={renderPieLabel} labelLine={false}>
                  {pieGenSeg.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0];
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow">
                      <p className="font-semibold">{d.name}</p>
                      <p>{formatGWh(d.value as number)}</p>
                    </div>
                  );
                }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* ── Detalle tecnológico PMGD y PMG ───────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PMGD por tecnología */}
        <SectionCard
          titulo="Capacidad PMGD por Tecnología"
          subtitulo={`${formatMW(totalPMGD)} en ${stats.totalUGPMGD.toLocaleString('es-CL')} unidades generadoras`}
          fuente="CEN Informe Mensual PMGD Ene-2025"
        >
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={piePMGDTech} cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={2} dataKey="value"
                  label={renderPieLabel} labelLine={false}>
                  {piePMGDTech.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0];
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow">
                      <p className="font-semibold">{d.name}</p>
                      <p>{formatMW(d.value as number)} — {(d.value as number / totalPMGD * 100).toFixed(1)}%</p>
                    </div>
                  );
                }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* PMG por tecnología */}
        <SectionCard
          titulo="Capacidad PMG por Tecnología"
          subtitulo={`${formatMW(totalPMG)} — Pequeños Medios de Generación`}
          fuente="CEN Informe Monitoreo 2024 · Infotécnica CEN"
        >
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={piePMGTech} cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={2} dataKey="value"
                  label={renderPieLabel} labelLine={false}>
                  {piePMGTech.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0];
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow">
                      <p className="font-semibold">{d.name}</p>
                      <p>{formatMW(d.value as number)} — {(d.value as number / totalPMG * 100).toFixed(1)}%</p>
                    </div>
                  );
                }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* ── Barras y Líneas del SEN ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Barras por nivel de tensión */}
        <SectionCard
          titulo="Barras del SEN por Nivel de Tensión"
          subtitulo={`${stats.totalBarras.toLocaleString('es-CL')} barras en total`}
          fuente="Infotécnica CEN — Instalaciones / Barras"
        >
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barrasData} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" style={{ fontSize: 10 }} tick={{ fill: '#6B7280' }} />
                <YAxis style={{ fontSize: 11 }} />
                <Tooltip content={<TTBarras />} />
                <Bar dataKey="cantidad" name="cantidad" fill="#6366F1" radius={[4, 4, 0, 0]}>
                  {barrasData.map((_, i) => {
                    const fills = ['#1D4ED8','#2563EB','#3B82F6','#60A5FA','#93C5FD','#BFDBFE','#DBEAFE','#EFF6FF'];
                    return <Cell key={i} fill={fills[i] || '#BFDBFE'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        {/* Líneas por nivel de tensión — longitud */}
        <SectionCard
          titulo="Líneas del SEN por Nivel de Tensión"
          subtitulo={`${stats.totalLineas.toLocaleString('es-CL')} tramos — ${stats.lineasPorTension.reduce((s, l) => s + l.kmTotales, 0).toLocaleString('es-CL')} km totales`}
          fuente="CEN Informe Transmisión 2023 · Infotécnica CEN"
        >
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.lineasPorTension.map(l => ({ name: l.tension, 'km': l.kmTotales, 'Tramos': l.cantidad }))}
                margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" style={{ fontSize: 10 }} tick={{ fill: '#6B7280' }} />
                <YAxis yAxisId="km" style={{ fontSize: 11 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <YAxis yAxisId="tramos" orientation="right" style={{ fontSize: 10 }} />
                <Tooltip content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-lg">
                      <p className="font-semibold text-gray-800 mb-1">{label}</p>
                      {payload.map((p: any, i: number) => (
                        <div key={i} className="flex gap-2 text-gray-600">
                          <span className="w-2 h-2 rounded-full mt-0.5" style={{ backgroundColor: p.fill }} />
                          <span>{p.name}:</span>
                          <span className="font-medium text-gray-800">
                            {p.dataKey === 'km' ? `${p.value.toLocaleString('es-CL')} km` : p.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }} />
                <Bar dataKey="km" yAxisId="km" fill="#F59E0B" radius={[4, 4, 0, 0]} name="km">
                  {stats.lineasPorTension.map((_, i) => {
                    const fills = ['#92400E','#B45309','#D97706','#F59E0B','#FCD34D','#FDE68A','#FEF3C7'];
                    return <Cell key={i} fill={fills[i] || '#FDE68A'} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* ── Tabla resumen capacidad ────────────────────────── */}
      <SectionCard
        titulo="Resumen de Capacidad Instalada por Tecnología y Segmento"
        subtitulo="Todos los valores en MW — Dic-2024"
        fuente={FUENTE}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left py-2 px-3 font-semibold text-gray-600">Tecnología</th>
                <th className="text-right py-2 px-3 font-semibold" style={{ color: COLOR_PMGD }}>PMGD</th>
                <th className="text-right py-2 px-3 font-semibold" style={{ color: COLOR_PMG }}>PMG</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-500">Resto SEN</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-800">Total</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-500">% PMGD</th>
              </tr>
            </thead>
            <tbody>
              {cap.sort((a, b) => b.total - a.total).map((r, i) => (
                <tr key={r.tecnologia} className={`border-b border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                  <td className="py-2 px-3 font-medium text-gray-700">{r.nombreTecnologia}</td>
                  <td className="py-2 px-3 text-right tabular-nums" style={{ color: r.pmgd > 0 ? COLOR_PMGD : '#CBD5E1' }}>
                    {r.pmgd > 0 ? formatMW(r.pmgd) : '—'}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums" style={{ color: r.pmg > 0 ? COLOR_PMG : '#CBD5E1' }}>
                    {r.pmg > 0 ? formatMW(r.pmg) : '—'}
                  </td>
                  <td className="py-2 px-3 text-right text-gray-500 tabular-nums">{formatMW(r.ninguno)}</td>
                  <td className="py-2 px-3 text-right font-semibold text-gray-800 tabular-nums">{formatMW(r.total)}</td>
                  <td className="py-2 px-3 text-right text-gray-400 tabular-nums">
                    {r.pmgd > 0 ? `${(r.pmgd / r.total * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td className="py-2 px-3 text-gray-800">Total SEN</td>
                <td className="py-2 px-3 text-right tabular-nums" style={{ color: COLOR_PMGD }}>{formatMW(totalPMGD)}</td>
                <td className="py-2 px-3 text-right tabular-nums" style={{ color: COLOR_PMG }}>{formatMW(totalPMG)}</td>
                <td className="py-2 px-3 text-right text-gray-500 tabular-nums">{formatMW(totalNinguno)}</td>
                <td className="py-2 px-3 text-right text-gray-800 tabular-nums">{formatMW(totalSEN)}</td>
                <td className="py-2 px-3 text-right text-gray-500 tabular-nums">{(totalPMGD/totalSEN*100).toFixed(1)}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
