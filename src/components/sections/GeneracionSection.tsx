'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import SectionCard from '@/components/ui/SectionCard';
import { formatGWh, formatPorcentaje, COLORES_TECNOLOGIA, NOMBRES_TECNOLOGIA } from '@/lib/utils';
import type { GeneracionTecnologia } from '@/lib/types';

const TECHS = ['solar','eolica','hidro','termicaGas','termicaCarbon','termicaPetroleo','geotermica','biogas','otros'] as const;

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value||0), 0);
  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 text-xs shadow-xl max-w-[220px]">
      <p className="text-slate-300 font-medium mb-2">{label} — {formatGWh(total)}</p>
      {[...payload].reverse().map((p:any,i:number)=>(
        <div key={i} className="flex items-center justify-between gap-3 text-slate-400 mb-0.5">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{backgroundColor:p.color}}/><span>{p.name}</span></div>
          <span className="text-white font-medium">{formatGWh(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function GeneracionSection({ generacion }: { generacion: GeneracionTecnologia[] }) {
  const ult = generacion[generacion.length - 1];
  const erncTotal = ult ? ult.porTecnologia.solar+ult.porTecnologia.eolica+ult.porTecnologia.hidro+ult.porTecnologia.geotermica+ult.porTecnologia.biogas : 0;
  const pctERNC = ult ? erncTotal/ult.totalGWh*100 : 0;
  const convTotal = ult ? ult.totalGWh - erncTotal : 0;

  const pieData = ult ? TECHS.filter(t=>ult.porTecnologia[t]>0).map(t=>({ name:NOMBRES_TECNOLOGIA[t], value:ult.porTecnologia[t], color:COLORES_TECNOLOGIA[t] })) : [];
  const areaData = generacion.slice(-12).map(g=>({ name:`${g.mes}`, mes:g.mes, ...TECHS.reduce((a,t)=>({...a,[NOMBRES_TECNOLOGIA[t]]:g.porTecnologia[t]}),{} as Record<string,number>) }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Generación Total', val: ult?formatGWh(ult.totalGWh):'-', color:'text-blue-300' },
          { label:'ERNC',             val: formatGWh(erncTotal),            color:'text-emerald-300' },
          { label:'Participación ERNC', val: formatPorcentaje(pctERNC),     color:'text-amber-300' },
          { label:'Térmica Total',    val: ult?formatGWh(convTotal):'-',    color:'text-rose-300' },
        ].map(k=>(
          <div key={k.label} className="rounded-lg bg-slate-800/60 border border-slate-700/50 p-4">
            <div className="text-xs text-slate-500 mb-1">{k.label}</div>
            <div className={`text-xl font-bold ${k.color}`}>{k.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard titulo="Mix de Generación" subtitulo={ult ? `${ult.mes} ${ult.anio}` : ''}>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value">
                  {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip content={({active,payload})=>{
                  if(!active||!payload?.length) return null;
                  const d=payload[0].payload;
                  return <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-2 text-xs"><div className="font-medium text-white">{d.name}</div><div className="text-slate-300">{formatGWh(d.value)}</div><div className="text-slate-400">{formatPorcentaje(d.value/(ult?.totalGWh||1)*100)}</div></div>;
                }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {pieData.slice(0,6).map(d=>(
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{backgroundColor:d.color}}/><span className="text-slate-400">{d.name}</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-200">{formatGWh(d.value)}</span>
                  <span className="text-slate-500 w-10 text-right">{formatPorcentaje(d.value/(ult?.totalGWh||1)*100)}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard titulo="Generación Mensual por Tecnología" subtitulo="Últimos 12 meses — GWh" className="lg:col-span-2">
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{top:5,right:10,left:10,bottom:5}}>
                <defs>
                  {TECHS.map(t=>(
                    <linearGradient key={t} id={`g-${t}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORES_TECNOLOGIA[t]} stopOpacity={0.6}/>
                      <stop offset="95%" stopColor={COLORES_TECNOLOGIA[t]} stopOpacity={0.1}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                <XAxis dataKey="mes" tick={{fill:'#94a3b8',fontSize:11}} axisLine={{stroke:'#334155'}} tickLine={false}/>
                <YAxis tickFormatter={v=>`${v} GWh`} tick={{fill:'#94a3b8',fontSize:9}} axisLine={false} tickLine={false} width={65}/>
                <Tooltip content={<TT/>}/>
                <Legend formatter={v=><span className="text-xs text-slate-400">{v}</span>}/>
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
