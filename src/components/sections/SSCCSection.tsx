'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import SectionCard from '@/components/ui/SectionCard';
import { formatCLP, COLORES_SSCC } from '@/lib/utils';
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
  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-300 font-medium mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-slate-400">
          <span className="w-2 h-2 rounded-full" style={{backgroundColor:p.color}}/><span>{p.name}:</span><span className="text-white font-medium">{formatCLP(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function SSCCSection({ pagos, unidades }: { pagos: SSCCPago[]; unidades: SSCCUnidad[] }) {
  const ultimo = pagos[pagos.length - 1];
  const pieData = ultimo ? TIPOS.map(({key,label},i)=>({ name:label, value:ultimo.porTipo[key], color:COLORS_ARR[i] })) : [];
  const historico = pagos.slice(-12).map(p=>({ name:p.mes, ...TIPOS.reduce((a,{key,label})=>({...a,[label]:p.porTipo[key]}),{} as Record<string,number>) }));
  const unidadesPorTec = unidades.reduce((a,u)=>({ ...a, [u.tecnologia]:(a[u.tecnologia]||0)+u.potenciaMW }),{} as Record<string,number>);
  const unidadesBar = Object.entries(unidadesPorTec).sort(([,a],[,b])=>b-a).map(([nombre,potencia])=>({nombre,potencia}));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <SectionCard titulo="Pagos SSCC por Tipo" subtitulo={ultimo ? `${ultimo.mes} ${ultimo.anio} — Total: ${formatCLP(ultimo.totalCLP)}` : ''}>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                  {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip content={({active,payload})=>{
                  if(!active||!payload?.length) return null;
                  const d=payload[0].payload;
                  return <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-2 text-xs"><div className="font-medium text-white">{d.name}</div><div className="text-slate-300">{formatCLP(d.value)}</div></div>;
                }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {pieData.map(d=>(
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{backgroundColor:d.color}}/><span className="text-slate-400">{d.name}</span></div>
                <span className="text-slate-200 font-medium">{formatCLP(d.value)}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard titulo="Evolución Pagos SSCC" subtitulo="Últimos 12 meses por tipo de servicio" className="lg:col-span-2">
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historico} margin={{top:5,right:10,left:10,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                <XAxis dataKey="name" tick={{fill:'#94a3b8',fontSize:11}} axisLine={{stroke:'#334155'}} tickLine={false}/>
                <YAxis tickFormatter={v=>formatCLP(v)} tick={{fill:'#94a3b8',fontSize:9}} axisLine={false} tickLine={false} width={78}/>
                <Tooltip content={<TT/>}/>
                <Legend formatter={v=><span className="text-xs text-slate-400">{v}</span>}/>
                {TIPOS.map(({label},i)=><Bar key={label} dataKey={label} stackId="a" fill={COLORS_ARR[i]} radius={i===TIPOS.length-1?[4,4,0,0]:undefined}/>)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      <SectionCard titulo="Unidades que Prestan Servicios Complementarios" subtitulo={`${unidades.length} unidades registradas — ${unidades[0]?.mesReporte||''} ${unidades[0]?.anioReporte||''}`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="text-slate-500 border-b border-slate-700">
                <th className="text-left py-2 font-medium">Unidad</th>
                <th className="text-left py-2 font-medium">Tecnología</th>
                <th className="text-right py-2 font-medium">MW</th>
                <th className="text-left py-2 font-medium">Servicios</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-800">
                {unidades.slice(0,10).map((u,i)=>(
                  <tr key={i} className="text-slate-300 hover:bg-slate-700/30 transition-colors">
                    <td className="py-2 pr-3 font-medium text-slate-200">{u.nombre}</td>
                    <td className="py-2 pr-3 text-slate-400">{u.tecnologia}</td>
                    <td className="py-2 text-right text-blue-300 font-medium">{u.potenciaMW}</td>
                    <td className="py-2 pl-3"><div className="flex flex-wrap gap-1">{u.serviciosPrestados.slice(0,2).map((s,j)=><span key={j} className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 text-[10px]">{s}</span>)}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="h-[250px]">
            <p className="text-xs text-slate-500 mb-3">MW por tecnología prestando SSCC</p>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={unidadesBar} layout="vertical" margin={{top:0,right:20,left:80,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false}/>
                <XAxis type="number" tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis dataKey="nombre" type="category" tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false} width={80}/>
                <Tooltip content={({active,payload,label})=>{
                  if(!active||!payload?.length) return null;
                  return <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-2 text-xs"><div className="font-medium text-white">{label}</div><div className="text-blue-300">{payload[0].value} MW</div></div>;
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
