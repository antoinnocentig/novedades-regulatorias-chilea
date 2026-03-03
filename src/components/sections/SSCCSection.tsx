'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import SectionCard from '@/components/ui/SectionCard';
import { formatCLP, formatPorcentaje, COLORES_SSCC } from '@/lib/utils';
import type { SSCCPago, SSCCUnidad } from '@/lib/types';

const TIPOS = [
  { key: 'regulacionFrecuencia' as const, label: 'Reg. Frecuencia' },
  { key: 'regulacionTension'    as const, label: 'Reg. Tensión'    },
  { key: 'arranqueSinRed'       as const, label: 'Arranque Sin Red'},
  { key: 'potenciaReactiva'     as const, label: 'Pot. Reactiva'   },
  { key: 'reservaGiro'          as const, label: 'Reserva en Giro' },
  { key: 'otros'                as const, label: 'Otros'           },
];
const COLORS_ARR = Object.values(COLORES_SSCC);

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value || 0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-lg">
      <p className="text-gray-700 font-semibold mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
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

export default function SSCCSection({ pagos, unidades }: { pagos: SSCCPago[]; unidades: SSCCUnidad[] }) {
  const ultimo = pagos[pagos.length - 1];
  const pieData = ultimo ? TIPOS.map(({key,label},i)=>({ name:label, value:ultimo.porTipo[key], color:COLORS_ARR[i] })) : [];
  const totalPie = pieData.reduce((s,d)=>s+d.value,0);
  const historico = pagos.slice(-12).map(p=>({ name:p.mes, ...TIPOS.reduce((a,{key,label})=>({...a,[label]:p.porTipo[key]}),{} as Record<string,number>) }));
  const unidadesPorTec = unidades.reduce((a,u)=>({ ...a, [u.tecnologia]:(a[u.tecnologia]||0)+u.potenciaMW }),{} as Record<string,number>);
  const unidadesBar = Object.entries(unidadesPorTec).sort(([,a],[,b])=>b-a).map(([nombre,potencia])=>({nombre,potencia}));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard titulo="Pagos SSCC por Tipo" subtitulo={ultimo ? `${ultimo.mes} ${ultimo.anio} — Total: ${formatCLP(ultimo.totalCLP)}` : ''} fuente="Coordinador Eléctrico Nacional — Balance de Servicios Complementarios">
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value"
                  label={(props: any) => {
                    const {cx,cy,midAngle,outerRadius,percent} = props;
                    if ((percent??0) < 0.05) return null;
                    const R = Math.PI/180, r = outerRadius+18;
                    const x = cx+r*Math.cos(-midAngle*R), y = cy+r*Math.sin(-midAngle*R);
                    return <text x={x} y={y} textAnchor={x>cx?'start':'end'} dominantBaseline="central" style={{fontSize:10,fill:'#374151',fontWeight:600}}>{`${((percent??0)*100).toFixed(0)}%`}</text>;
                  }} labelLine={false}
                >
                  {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip content={({active,payload})=>{
                  if(!active||!payload?.length) return null;
                  const d=payload[0].payload;
                  return <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow"><div className="font-semibold text-gray-800">{d.name}</div><div className="text-gray-500">{formatCLP(d.value)}</div><div className="text-blue-600 font-bold">{formatPorcentaje(totalPie>0?d.value/totalPie*100:0)}</div></div>;
                }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {pieData.map(d=>(
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:d.color}}/><span className="text-gray-600">{d.name}</span></div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400 text-[10px]">{formatCLP(d.value)}</span>
                  <span className="font-bold text-gray-800 w-10 text-right">{formatPorcentaje(totalPie>0?d.value/totalPie*100:0)}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard titulo="Evolución Pagos SSCC" subtitulo="Últimos 12 meses por tipo de servicio" fuente="Coordinador Eléctrico Nacional — Balance de Servicios Complementarios" className="lg:col-span-2">
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historico} margin={{top:5,right:10,left:10,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
                <XAxis dataKey="name" tick={{fill:'#6b7280',fontSize:11}} axisLine={{stroke:'#d1d5db'}} tickLine={false}/>
                <YAxis tickFormatter={v=>formatCLP(v)} tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false} width={78}/>
                <Tooltip content={<TT/>}/>
                <Legend formatter={v=><span className="text-xs text-gray-500">{v}</span>}/>
                {TIPOS.map(({label},i)=><Bar key={label} dataKey={label} stackId="a" fill={COLORS_ARR[i]} radius={i===TIPOS.length-1?[4,4,0,0]:undefined}/>)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard titulo="Unidades que Prestan Servicios Complementarios" subtitulo={`${unidades.length} unidades registradas — ${unidades[0]?.mesReporte||''} ${unidades[0]?.anioReporte||''}`} fuente="Coordinador Eléctrico Nacional — Registro de Unidades SSCC">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-gray-500 border-b border-gray-200">
                <th className="text-left py-2 font-medium">Unidad</th>
                <th className="text-left py-2 font-medium">Tecnología</th>
                <th className="text-right py-2 font-medium">MW</th>
                <th className="text-left py-2 font-medium">Servicios</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100">
                {unidades.slice(0,10).map((u,i)=>(
                  <tr key={i} className="text-gray-700 hover:bg-gray-50 transition-colors">
                    <td className="py-2 pr-3 font-medium text-gray-800">{u.nombre}</td>
                    <td className="py-2 pr-3 text-gray-500">{u.tecnologia}</td>
                    <td className="py-2 text-right text-blue-600 font-medium">{u.potenciaMW}</td>
                    <td className="py-2 pl-3"><div className="flex flex-wrap gap-1">{u.serviciosPrestados.slice(0,2).map((s,j)=><span key={j} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px]">{s}</span>)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="h-[250px]">
            <p className="text-xs text-gray-400 mb-3">MW por tecnología prestando SSCC</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={unidadesBar} layout="vertical" margin={{top:0,right:20,left:80,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false}/>
                <XAxis type="number" tick={{fill:'#9ca3af',fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis dataKey="nombre" type="category" tick={{fill:'#6b7280',fontSize:10}} axisLine={false} tickLine={false} width={80}/>
                <Tooltip content={({active,payload,label})=>{
                  if(!active||!payload?.length) return null;
                  return <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow"><div className="font-semibold text-gray-800">{label}</div><div className="text-blue-600 font-medium">{payload[0].value} MW</div></div>;
                }}/>
                <Bar dataKey="potencia" fill="#3B82F6" radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
