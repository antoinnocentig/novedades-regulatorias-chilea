'use client';

import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import SectionCard from '@/components/ui/SectionCard';
import { formatMW, formatMWh, formatPorcentaje } from '@/lib/utils';
import type { AlmacenamientoRegion, AlmacenamientoEvolucion } from '@/lib/types';

export default function AlmacenamientoSection({ regiones, evolucion }: { regiones: AlmacenamientoRegion[]; evolucion: AlmacenamientoEvolucion[] }) {
  const totalMW  = regiones.reduce((s,r)=>s+r.potenciaMW,0);
  const totalMWh = regiones.reduce((s,r)=>s+r.capacidadMWh,0);
  const totalProyectos = regiones.reduce((s,r)=>s+r.proyectos,0);
  const ultimo = evolucion[evolucion.length-1];
  const primero = evolucion[0];
  const crecimiento = primero.totalMW > 0 ? (ultimo.totalMW - primero.totalMW) / primero.totalMW * 100 : 0;

  const pieData = regiones.map((r,i)=>({
    name: r.region.length>14 ? r.region.slice(0,13)+'.' : r.region,
    fullName: r.region,
    value: r.potenciaMW,
    color: ['#06B6D4','#0EA5E9','#3B82F6','#6366F1','#8B5CF6','#A78BFA','#22D3EE','#38BDF8','#93C5FD'][i%9],
  }));

  const areaData = evolucion.map(e=>({ name:`${e.mes} ${e.anio}`, 'MW':e.totalMW, 'MWh':e.totalMWh/4, proyectos:e.proyectosOperativos }));

  const barData = regiones.sort((a,b)=>b.potenciaMW-a.potenciaMW).map(r=>({
    name: r.region.length>12 ? r.region.slice(0,11)+'.' : r.region,
    fullName: r.region,
    'Potencia MW': r.potenciaMW,
    'Capacidad ÷4 MW': r.capacidadMWh/4,
    proyectos: r.proyectos,
    capacidadMWh: r.capacidadMWh,
  }));

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Potencia Total BESS',     val: formatMW(totalMW),                    color:'text-cyan-700',    bg:'bg-cyan-50',    border:'border-cyan-200' },
          { label:'Capacidad Almacenamiento', val: `${(totalMWh/1000).toFixed(1)} GWh`, color:'text-blue-700',    bg:'bg-blue-50',    border:'border-blue-200' },
          { label:'Proyectos Operativos',     val: `${totalProyectos}`,                  color:'text-emerald-700', bg:'bg-emerald-50', border:'border-emerald-200' },
          { label:'Crecimiento 2 años',       val: `+${crecimiento.toFixed(0)}%`,        color:'text-amber-700',   bg:'bg-amber-50',   border:'border-amber-200' },
        ].map(k=>(
          <div key={k.label} className={`rounded-lg ${k.bg} border ${k.border} p-4 shadow-sm`}>
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className={`text-xl font-bold ${k.color}`}>{k.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Distribución por región (pie) */}
        <SectionCard
          titulo="BESS por Región"
          subtitulo={`${totalProyectos} proyectos operativos — Dic-2025`}
          fuente="CNE Energía Abierta — Reporte Mensual Sector Energético"
        >
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={80} paddingAngle={2} dataKey="value"
                  label={(props:any)=>{
                    const {cx,cy,midAngle,outerRadius,percent}=props;
                    if((percent??0)<0.05) return null;
                    const R=Math.PI/180, r=outerRadius+18;
                    const x=cx+r*Math.cos(-midAngle*R), y=cy+r*Math.sin(-midAngle*R);
                    return <text x={x} y={y} textAnchor={x>cx?'start':'end'} dominantBaseline="central" style={{fontSize:9,fill:'#374151',fontWeight:600}}>{`${((percent??0)*100).toFixed(0)}%`}</text>;
                  }} labelLine={false}
                >
                  {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip content={({active,payload})=>{
                  if(!active||!payload?.length) return null;
                  const d=payload[0].payload;
                  return <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow"><div className="font-semibold">{d.fullName}</div><div className="text-cyan-600">{formatMW(d.value)}</div><div className="text-gray-500">{formatPorcentaje(d.value/totalMW*100)}</div></div>;
                }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-1">
            {pieData.sort((a,b)=>b.value-a.value).slice(0,6).map(d=>(
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:d.color}}/><span className="text-gray-600 truncate">{d.fullName}</span></div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-gray-400 text-[10px]">{formatMW(d.value)}</span>
                  <span className="font-bold text-gray-800 w-9 text-right">{formatPorcentaje(d.value/totalMW*100)}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Evolución temporal */}
        <SectionCard
          titulo="Evolución Almacenamiento BESS"
          subtitulo="Capacidad instalada en operación (MW) — Ene-2024 a Dic-2025"
          fuente="CNE Energía Abierta — Reporte Mensual Sector Energético"
          className="lg:col-span-2"
        >
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{top:5,right:10,left:10,bottom:5}}>
                <defs>
                  <linearGradient id="gBESS" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.7}/>
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0.05}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                <XAxis dataKey="name" tick={{fill:'#6b7280',fontSize:9}} axisLine={{stroke:'#d1d5db'}} tickLine={false} interval={3}/>
                <YAxis tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>`${v} MW`} width={58}/>
                <Tooltip content={({active,payload,label})=>{
                  if(!active||!payload?.length) return null;
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-lg">
                      <p className="font-semibold text-gray-800 mb-2">{label}</p>
                      <div className="text-cyan-700">Potencia: <b>{formatMW(payload[0]?.value as number)}</b></div>
                      <div className="text-blue-600">Capacidad: <b>{formatMWh((payload[0]?.value as number)*4)}</b></div>
                      <div className="text-gray-500">Proyectos: {payload[2]?.value}</div>
                    </div>
                  );
                }}/>
                <Area type="monotone" dataKey="MW" stroke="#06B6D4" fill="url(#gBESS)" strokeWidth={2} dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-gray-400">
            * BESS del Desierto (200 MW / 800 MWh) inaugurado en Antofagasta, Abr-2025. Primer BESS stand-alone de gran escala en LATAM.
          </div>
        </SectionCard>
      </div>

      {/* Tabla por región */}
      <SectionCard
        titulo="Capacidad de Almacenamiento por Región"
        subtitulo="Proyectos BESS operativos — Dic-2025"
        fuente="CNE Energía Abierta — Reporte Mensual Sector Energético · Ministerio de Energía"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-500 border-b border-gray-200">
                  <th className="text-left py-2 font-medium">Región</th>
                  <th className="text-right py-2 font-medium">MW</th>
                  <th className="text-right py-2 font-medium">MWh</th>
                  <th className="text-right py-2 font-medium">h</th>
                  <th className="text-right py-2 font-medium">Proyectos</th>
                  <th className="text-right py-2 font-medium">% Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {regiones.sort((a,b)=>b.potenciaMW-a.potenciaMW).map((r,i)=>(
                  <tr key={i} className="text-gray-700 hover:bg-gray-50">
                    <td className="py-2 pr-3 font-medium text-gray-800">{r.region}</td>
                    <td className="py-2 text-right text-cyan-700 font-bold">{r.potenciaMW}</td>
                    <td className="py-2 text-right text-blue-600">{r.capacidadMWh.toLocaleString('es-CL')}</td>
                    <td className="py-2 text-right text-gray-500">{(r.capacidadMWh/r.potenciaMW).toFixed(1)}</td>
                    <td className="py-2 text-right">{r.proyectos}</td>
                    <td className="py-2 text-right text-gray-600">{(r.potenciaMW/totalMW*100).toFixed(1)}%</td>
                  </tr>
                ))}
                <tr className="font-bold border-t-2 border-gray-300 text-gray-900">
                  <td className="py-2">TOTAL</td>
                  <td className="py-2 text-right text-cyan-700">{totalMW}</td>
                  <td className="py-2 text-right text-blue-600">{totalMWh.toLocaleString('es-CL')}</td>
                  <td className="py-2 text-right text-gray-500">{(totalMWh/totalMW).toFixed(1)}</td>
                  <td className="py-2 text-right">{totalProyectos}</td>
                  <td className="py-2 text-right">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="h-[250px]">
            <p className="text-xs text-gray-400 mb-2">Potencia por región (MW)</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{top:0,right:40,left:92,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false}/>
                <XAxis type="number" tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis dataKey="name" type="category" tick={{fill:'#6b7280',fontSize:10}} axisLine={false} tickLine={false} width={90}/>
                <Tooltip content={({active,payload,label})=>{
                  if(!active||!payload?.length) return null;
                  return <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow"><div className="font-semibold">{barData.find(b=>b.name===label)?.fullName||label}</div><div className="text-cyan-700">Potencia: {formatMW(payload[0]?.value as number)}</div><div className="text-blue-600">Capacidad: {formatMWh((barData.find(b=>b.name===label)?.capacidadMWh)||0)}</div></div>;
                }}/>
                <Bar dataKey="Potencia MW" fill="#06B6D4" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
