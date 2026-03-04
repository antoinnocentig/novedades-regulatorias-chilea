'use client';

import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import SectionCard from '@/components/ui/SectionCard';
import { formatGWh, formatMW, formatPorcentaje, COLORES_SECTOR } from '@/lib/utils';
import type { DemandaMensual } from '@/lib/types';

const SECTORES = [
  { key:'minero'      as const, label:'Minería' },
  { key:'industrial'  as const, label:'Industrial' },
  { key:'residencial' as const, label:'Residencial' },
  { key:'comercial'   as const, label:'Comercial' },
  { key:'otros'       as const, label:'Otros' },
];

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value||0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-lg">
      <p className="text-gray-700 font-semibold mb-2">{label}</p>
      {[...payload].reverse().map((p:any,i:number)=>(
        <div key={i} className="flex items-center justify-between gap-3 text-gray-500 mb-0.5">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{backgroundColor:p.color}}/><span>{p.name}:</span></div>
          <div className="flex items-center gap-2">
            <span className="text-gray-800 font-medium">{formatGWh(p.value)}</span>
            {total>0 && <span className="text-gray-400">{(p.value/total*100).toFixed(1)}%</span>}
          </div>
        </div>
      ))}
      <div className="border-t border-gray-100 mt-2 pt-1 font-bold text-blue-700">Total: {formatGWh(total)}</div>
    </div>
  );
};

export default function DemandaSection({ demanda }: { demanda: DemandaMensual[] }) {
  const ult = demanda[demanda.length-1];
  const ant = demanda[demanda.length-2];
  const varMes = ant && ant.totalGWh > 0 ? (ult.totalGWh - ant.totalGWh) / ant.totalGWh * 100 : 0;

  const pieUlt = SECTORES.map(s=>({ name:s.label, value:ult.porSector[s.key], color:COLORES_SECTOR[s.key] }));

  const areaData = demanda.slice(-13).map(d=>({
    name:`${d.mes} ${String(d.anio).slice(2)}`,
    ...SECTORES.reduce((a,s)=>({...a,[s.label]:d.porSector[s.key]}),{} as Record<string,number>),
    total: d.totalGWh,
  }));

  const barMaxima = demanda.slice(-12).map(d=>({
    name:d.mes,
    'Demanda Máxima (MW)': d.demandaMaximaMW,
    'Factor de Carga (%)': d.factorCarga,
  }));

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:`Demanda Total ${ult.mes} ${ult.anio}`, val: formatGWh(ult.totalGWh), color:'text-blue-700', bg:'bg-blue-50', border:'border-blue-200', note: varMes !== 0 ? `${varMes>0?'+':''}${varMes.toFixed(1)}% vs mes anterior` : '' },
          { label:'Demanda Máxima',   val: formatMW(ult.demandaMaximaMW), color:'text-rose-700',    bg:'bg-rose-50',    border:'border-rose-200', note: `Factor carga: ${ult.factorCarga.toFixed(0)}%` },
          { label:'Sector Minero',    val: formatGWh(ult.porSector.minero), color:'text-amber-700', bg:'bg-amber-50',   border:'border-amber-200', note: `${(ult.porSector.minero/ult.totalGWh*100).toFixed(0)}% del total` },
          { label:'Sector Residencial', val: formatGWh(ult.porSector.residencial), color:'text-emerald-700', bg:'bg-emerald-50', border:'border-emerald-200', note: `${(ult.porSector.residencial/ult.totalGWh*100).toFixed(0)}% del total` },
        ].map(k=>(
          <div key={k.label} className={`rounded-lg ${k.bg} border ${k.border} p-4 shadow-sm`}>
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className={`text-xl font-bold ${k.color}`}>{k.val}</div>
            {k.note && <div className="text-xs text-gray-400 mt-1">{k.note}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie sectorial último mes */}
        <SectionCard
          titulo="Distribución por Sector"
          subtitulo={`${ult.mes} ${ult.anio} — Total: ${formatGWh(ult.totalGWh)}`}
          fuente="CNE — Reporte Mensual Sector Energético · Informe Financiero"
        >
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieUlt} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value"
                  label={(props:any)=>{
                    const {cx,cy,midAngle,outerRadius,percent}=props;
                    if((percent??0)<0.04) return null;
                    const R=Math.PI/180, r=outerRadius+18;
                    const x=cx+r*Math.cos(-midAngle*R), y=cy+r*Math.sin(-midAngle*R);
                    return <text x={x} y={y} textAnchor={x>cx?'start':'end'} dominantBaseline="central" style={{fontSize:10,fill:'#374151',fontWeight:600}}>{`${((percent??0)*100).toFixed(1)}%`}</text>;
                  }} labelLine={false}
                >
                  {pieUlt.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip content={({active,payload})=>{
                  if(!active||!payload?.length) return null;
                  const d=payload[0].payload;
                  return <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow"><div className="font-semibold">{d.name}</div><div className="text-blue-600">{formatGWh(d.value)}</div><div className="text-gray-500">{formatPorcentaje(d.value/ult.totalGWh*100)}</div></div>;
                }}/>
                <Legend formatter={v=><span className="text-xs text-gray-500">{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-1">
            {SECTORES.map(s=>(
              <div key={s.key} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:COLORES_SECTOR[s.key]}}/><span className="text-gray-600">{s.label}</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-[10px]">{formatGWh(ult.porSector[s.key])}</span>
                  <span className="font-bold text-gray-800 w-10 text-right">{(ult.porSector[s.key]/ult.totalGWh*100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Evolución demanda total por sector */}
        <SectionCard
          titulo="Demanda Mensual por Sector"
          subtitulo="Últimos 13 meses — GWh"
          fuente="CNE — Reporte Mensual Sector Energético"
          className="lg:col-span-2"
        >
          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{top:5,right:10,left:10,bottom:5}}>
                <defs>
                  {SECTORES.map(s=>(
                    <linearGradient key={s.key} id={`gD-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORES_SECTOR[s.key]} stopOpacity={0.75}/>
                      <stop offset="95%" stopColor={COLORES_SECTOR[s.key]} stopOpacity={0.1}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                <XAxis dataKey="name" tick={{fill:'#6b7280',fontSize:10}} axisLine={{stroke:'#d1d5db'}} tickLine={false}/>
                <YAxis tickFormatter={v=>`${v} GWh`} tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false} width={65}/>
                <Tooltip content={<TT/>}/>
                <Legend formatter={v=><span className="text-xs text-gray-500">{v}</span>}/>
                {SECTORES.map(s=>(
                  <Area key={s.key} type="monotone" dataKey={s.label} stackId="1" stroke={COLORES_SECTOR[s.key]} fill={`url(#gD-${s.key})`} strokeWidth={1.5}/>
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Demanda máxima mensual */}
      <SectionCard
        titulo="Demanda Máxima Mensual"
        subtitulo="Últimos 12 meses — MW punta y factor de carga"
        fuente="CNE — Reporte Mensual Sector Energético · CEN Operación"
      >
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barMaxima} margin={{top:5,right:10,left:10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
              <XAxis dataKey="name" tick={{fill:'#6b7280',fontSize:11}} axisLine={{stroke:'#d1d5db'}} tickLine={false}/>
              <YAxis yAxisId="left" tickFormatter={v=>`${v} MW`} tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false} width={68}/>
              <YAxis yAxisId="right" orientation="right" domain={[60,80]} tickFormatter={v=>`${v}%`} tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false} width={40}/>
              <Tooltip content={({active,payload,label})=>{
                if(!active||!payload?.length) return null;
                return <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-lg">
                  <p className="font-semibold text-gray-800 mb-1">{label}</p>
                  <div className="text-rose-600">Máx: {formatMW(payload[0]?.value as number)}</div>
                  <div className="text-blue-600">Factor Carga: {(payload[1]?.value as number).toFixed(1)}%</div>
                </div>;
              }}/>
              <Bar yAxisId="left"  dataKey="Demanda Máxima (MW)" fill="#EF4444" radius={[4,4,0,0]}/>
              <Bar yAxisId="right" dataKey="Factor de Carga (%)" fill="#3B82F6" radius={[4,4,0,0]}/>
              <Legend formatter={v=><span className="text-xs text-gray-500">{v}</span>}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
