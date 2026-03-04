'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import SectionCard from '@/components/ui/SectionCard';
import { formatGWh, formatPorcentaje, COLORES_TECNOLOGIA, NOMBRES_TECNOLOGIA } from '@/lib/utils';
import type { GeneracionTecnologia } from '@/lib/types';

const TECHS = ['solar','eolica','hidroEmbalse','hidroPasada','miniHidro','termicaGas','termicaCarbon','termicaDiesel','geotermica','biomasa','bess','otros'] as const;

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value||0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-lg max-w-[240px]">
      <p className="text-gray-700 font-semibold mb-2">{label} — {formatGWh(total)}</p>
      {[...payload].reverse().map((p:any,i:number)=>(
        <div key={i} className="flex items-center justify-between gap-3 text-gray-500 mb-0.5">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{backgroundColor:p.color}}/><span>{p.name}</span></div>
          <div className="flex items-center gap-2">
            <span className="text-gray-800 font-medium">{formatGWh(p.value)}</span>
            <span className="text-gray-400">{formatPorcentaje(p.value/total*100)}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default function GeneracionSection({ generacion }: { generacion: GeneracionTecnologia[] }) {
  const ult = generacion[generacion.length - 1];
  const pctERNC = ult ? ult.participacionERNC : 0;
  const erncTotal = ult ? ult.totalGWh * pctERNC / 100 : 0;
  const convTotal = ult ? ult.totalGWh - erncTotal : 0;

  const pieData = ult ? TECHS.filter(t=>ult.porTecnologia[t]>0).map(t=>({ name:NOMBRES_TECNOLOGIA[t], value:ult.porTecnologia[t], color:COLORES_TECNOLOGIA[t] })) : [];
  const areaData = generacion.slice(-12).map(g=>({ name:`${g.mes}`, mes:g.mes, ...TECHS.reduce((a,t)=>({...a,[NOMBRES_TECNOLOGIA[t]]:g.porTecnologia[t]}),{} as Record<string,number>) }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Generación Total',   val: ult?formatGWh(ult.totalGWh):'-', color:'text-blue-700',    bg:'bg-blue-50',    border:'border-blue-200' },
          { label:'ERNC',               val: formatGWh(erncTotal),            color:'text-emerald-700', bg:'bg-emerald-50', border:'border-emerald-200' },
          { label:'Participación ERNC', val: formatPorcentaje(pctERNC),       color:'text-amber-700',   bg:'bg-amber-50',   border:'border-amber-200' },
          { label:'Térmica Total',      val: ult?formatGWh(convTotal):'-',    color:'text-rose-700',    bg:'bg-rose-50',    border:'border-rose-200' },
        ].map(k=>(
          <div key={k.label} className={`rounded-lg ${k.bg} border ${k.border} p-4 shadow-sm`}>
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className={`text-xl font-bold ${k.color}`}>{k.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard
          titulo="Mix de Generación"
          subtitulo={ult ? `${ult.mes} ${ult.anio}` : ''}
          fuente="Coordinador Eléctrico Nacional — energiaabierta.cl"
        >
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value"
                  label={(props: any) => {
                    const {cx,cy,midAngle,outerRadius,percent} = props;
                    if ((percent??0) < 0.04) return null;
                    const R = Math.PI/180, r = outerRadius+22;
                    const x = cx+r*Math.cos(-midAngle*R), y = cy+r*Math.sin(-midAngle*R);
                    return <text x={x} y={y} textAnchor={x>cx?'start':'end'} dominantBaseline="central" style={{fontSize:10,fill:'#374151',fontWeight:600}}>{`${((percent??0)*100).toFixed(1)}%`}</text>;
                  }}
                  labelLine={false}
                >
                  {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip content={({active,payload})=>{
                  if(!active||!payload?.length) return null;
                  const d=payload[0].payload;
                  return <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow"><div className="font-semibold text-gray-800">{d.name}</div><div className="text-gray-600">{formatGWh(d.value)}</div><div className="text-blue-600 font-bold">{formatPorcentaje(d.value/(ult?.totalGWh||1)*100)}</div></div>;
                }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {pieData.slice(0,7).map(d=>(
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:d.color}}/><span className="text-gray-600">{d.name}</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-[10px]">{formatGWh(d.value)}</span>
                  <span className="font-bold text-gray-800 w-12 text-right">{formatPorcentaje(d.value/(ult?.totalGWh||1)*100)}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          titulo="Generación Mensual por Tecnología"
          subtitulo="Últimos 12 meses — GWh"
          fuente="Coordinador Eléctrico Nacional — Reporte Energético / energiaabierta.cl"
          className="lg:col-span-2"
        >
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{top:5,right:10,left:10,bottom:5}}>
                <defs>
                  {TECHS.map(t=>(
                    <linearGradient key={t} id={`g-${t}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORES_TECNOLOGIA[t]} stopOpacity={0.7}/>
                      <stop offset="95%" stopColor={COLORES_TECNOLOGIA[t]} stopOpacity={0.15}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                <XAxis dataKey="mes" tick={{fill:'#6b7280',fontSize:11}} axisLine={{stroke:'#d1d5db'}} tickLine={false}/>
                <YAxis tickFormatter={v=>`${v} GWh`} tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false} width={65}/>
                <Tooltip content={<TT/>}/>
                <Legend formatter={v=><span className="text-xs text-gray-500">{v}</span>}/>
                {TECHS.filter(t=>ult&&ult.porTecnologia[t]>0).map(t=>(
                  <Area key={t} type="monotone" dataKey={NOMBRES_TECNOLOGIA[t]} stackId="1" stroke={COLORES_TECNOLOGIA[t]} fill={`url(#g-${t})`} strokeWidth={1.5}/>
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
