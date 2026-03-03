'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import SectionCard from '@/components/ui/SectionCard';
import { formatCLP, formatPorcentaje, COLORES_TECNOLOGIA, NOMBRES_TECNOLOGIA } from '@/lib/utils';
import type { PotenciaTecnologia } from '@/lib/types';

const TECHS = ['hidro','termicaGas','solar','termicaCarbon','eolica','termicaPetroleo','geotermica','otros'] as const;

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-lg">
      <p className="text-gray-700 font-semibold mb-2">{label}</p>
      {[...payload].reverse().map((p:any,i:number)=>(
        <div key={i} className="flex items-center justify-between gap-3 text-gray-500 mb-0.5">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{backgroundColor:p.color}}/><span>{p.name}:</span></div>
          <div className="flex items-center gap-2">
            <span className="text-gray-800 font-medium">{formatCLP(p.value)}</span>
            {total > 0 && <span className="text-gray-400">{(p.value/total*100).toFixed(1)}%</span>}
          </div>
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
        <SectionCard titulo="Pagos Potencia por Tecnología" subtitulo={ult ? `${ult.mes} ${ult.anio} — Total: ${formatCLP(ult.totalCLP)}` : ''} fuente="Coordinador Eléctrico Nacional — Potencia de Suficiencia (PLABACOM)">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={85} paddingAngle={2} dataKey="value"
                  label={(props: any) => {
                    const {cx,cy,midAngle,outerRadius,percent} = props;
                    if ((percent??0) < 0.04) return null;
                    const R = Math.PI/180, r = outerRadius+20;
                    const x = cx+r*Math.cos(-midAngle*R), y = cy+r*Math.sin(-midAngle*R);
                    return <text x={x} y={y} textAnchor={x>cx?'start':'end'} dominantBaseline="central" style={{fontSize:10,fill:'#374151',fontWeight:600}}>{`${((percent??0)*100).toFixed(1)}%`}</text>;
                  }} labelLine={false}
                >
                  {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip content={({active,payload})=>{
                  if(!active||!payload?.length) return null;
                  const d=payload[0].payload;
                  return <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow"><div className="font-semibold text-gray-800">{d.name}</div><div className="text-gray-500">{formatCLP(d.value)}</div><div className="text-blue-600 font-bold">{formatPorcentaje(d.value/(ult?.totalCLP||1)*100)}</div></div>;
                }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {pieData.slice(0,6).map(d=>(
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:d.color}}/><span className="text-gray-600">{d.name}</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-[10px]">{formatCLP(d.value)}</span>
                  <span className="font-bold text-gray-800 w-10 text-right">{formatPorcentaje(d.value/(ult?.totalCLP||1)*100)}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard titulo="Pagos Potencia de Suficiencia Mensual" subtitulo="Últimos 12 meses por tipo de tecnología" fuente="Coordinador Eléctrico Nacional — Potencia de Suficiencia (PLABACOM)" className="lg:col-span-2">
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{top:5,right:10,left:10,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                <XAxis dataKey="name" tick={{fill:'#6b7280',fontSize:11}} axisLine={{stroke:'#d1d5db'}} tickLine={false}/>
                <YAxis tickFormatter={v=>formatCLP(v)} tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false} width={82}/>
                <Tooltip content={<TT/>}/>
                <Legend formatter={v=><span className="text-xs text-gray-500">{v}</span>}/>
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
