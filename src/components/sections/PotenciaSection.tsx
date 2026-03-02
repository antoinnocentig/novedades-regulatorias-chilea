'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import SectionCard from '@/components/ui/SectionCard';
import { formatCLP, COLORES_TECNOLOGIA, NOMBRES_TECNOLOGIA } from '@/lib/utils';
import type { PotenciaTecnologia } from '@/lib/types';

const TECHS = ['hidro','termicaGas','solar','termicaCarbon','eolica','termicaPetroleo','geotermica','otros'] as const;

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-300 font-medium mb-2">{label}</p>
      {[...payload].reverse().map((p:any,i:number)=>(
        <div key={i} className="flex items-center justify-between gap-3 text-slate-400 mb-0.5">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{backgroundColor:p.color}}/><span>{p.name}</span></div>
          <span className="text-white font-medium">{formatCLP(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function PotenciaSection({ potencia }: { potencia: PotenciaTecnologia[] }) {
  const ult = potencia[potencia.length - 1];
  const pieData = ult ? TECHS.filter(t=>ult.porTecnologia[t]>0).map(t=>({ name:NOMBRES_TECNOLOGIA[t]||t, value:ult.porTecnologia[t], color:COLORES_TECNOLOGIA[t]||'#6B7280' })) : [];
  const barData = potencia.slice(-12).map(p=>({ name:p.mes, ...TECHS.reduce((a,t)=>({...a,[NOMBRES_TECNOLOGIA[t]||t]:p.porTecnologia[t]}),{} as Record<string,number>) }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard titulo="Pagos Potencia por Tecnología" subtitulo={ult ? `${ult.mes} ${ult.anio} — Total: ${formatCLP(ult.totalCLP)}` : ''}>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value">
                  {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip content={({active,payload})=>{
                  if(!active||!payload?.length) return null;
                  const d=payload[0].payload;
                  return <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-2 text-xs"><div className="font-medium text-white">{d.name}</div><div className="text-slate-300">{formatCLP(d.value)}</div><div className="text-slate-400">{(d.value/(ult?.totalCLP||1)*100).toFixed(1)}%</div></div>;
                }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {pieData.slice(0,6).map(d=>(
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{backgroundColor:d.color}}/><span className="text-slate-400">{d.name}</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-200">{formatCLP(d.value)}</span>
                  <span className="text-slate-500 w-10 text-right">{(d.value/(ult?.totalCLP||1)*100).toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard titulo="Pagos Potencia de Suficiencia Mensual" subtitulo="Últimos 12 meses por tipo de tecnología" className="lg:col-span-2">
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{top:5,right:10,left:10,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                <XAxis dataKey="name" tick={{fill:'#94a3b8',fontSize:11}} axisLine={{stroke:'#334155'}} tickLine={false}/>
                <YAxis tickFormatter={v=>formatCLP(v)} tick={{fill:'#94a3b8',fontSize:9}} axisLine={false} tickLine={false} width={82}/>
                <Tooltip content={<TT/>}/>
                <Legend formatter={v=><span className="text-xs text-slate-400">{v}</span>}/>
                {TECHS.filter(t=>ult&&ult.porTecnologia[t]>0).map((t,i)=>(
                  <Bar key={t} dataKey={NOMBRES_TECNOLOGIA[t]||t} stackId="a" fill={COLORES_TECNOLOGIA[t]||'#6B7280'} radius={i===TECHS.length-1?[4,4,0,0]:undefined}/>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
