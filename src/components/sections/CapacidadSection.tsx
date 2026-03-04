'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import SectionCard from '@/components/ui/SectionCard';
import { formatMW, formatPorcentaje, COLORES_TECNOLOGIA, NOMBRES_TECNOLOGIA } from '@/lib/utils';
import type { CapacidadTecnologia, CapacidadRegion } from '@/lib/types';

const TECHS_CAP = ['solar','eolica','hidroEmbalse','hidroPasada','miniHidro','termicaGas','termicaCarbon','termicaDiesel','geotermica','biomasa','bess','otros'] as const;

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
            <span className="text-gray-800 font-medium">{formatMW(p.value)}</span>
            {total>0 && <span className="text-gray-400">{(p.value/total*100).toFixed(1)}%</span>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default function CapacidadSection({ tecnologia, regiones }: { tecnologia: CapacidadTecnologia; regiones: CapacidadRegion[] }) {
  const pt = tecnologia.porTecnologia;
  const pieData = TECHS_CAP.filter(t=>pt[t]>0).map(t=>({ name: NOMBRES_TECNOLOGIA[t]||t, value: pt[t], color: COLORES_TECNOLOGIA[t]||'#6B7280' }));
  const totalERNC = pt.solar + pt.eolica + pt.hidroEmbalse + pt.hidroPasada + pt.miniHidro + pt.geotermica + pt.biomasa + pt.bess;
  const pctERNC = tecnologia.totalMW > 0 ? totalERNC / tecnologia.totalMW * 100 : 0;

  // Barras por región (top 10)
  const regionesTop = [...regiones].sort((a,b)=>b.totalMW-a.totalMW).slice(0,10);
  const regionData = regionesTop.map(r=>({
    name: r.region.length > 12 ? r.region.slice(0,11)+'.' : r.region,
    fullName: r.region,
    'Solar FV': r.solar,
    'Eólica': r.eolica,
    'Hidráulica': r.hidro,
    'Térmica': r.termica,
    'BESS': r.bess,
    'Otros': r.otros,
    total: r.totalMW,
  }));

  const COLORES_REG = { 'Solar FV':'#F59E0B', 'Eólica':'#22C55E', 'Hidráulica':'#3B82F6', 'Térmica':'#9CA3AF', 'BESS':'#06B6D4', 'Otros':'#CBD5E1' };

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:'Capacidad Total SEN', val: formatMW(tecnologia.totalMW),    color:'text-blue-700',    bg:'bg-blue-50',    border:'border-blue-200' },
          { label:'Renovables (incl. BESS)', val: formatMW(totalERNC),          color:'text-emerald-700', bg:'bg-emerald-50', border:'border-emerald-200' },
          { label:'% Renovables',          val: formatPorcentaje(pctERNC),      color:'text-amber-700',   bg:'bg-amber-50',   border:'border-amber-200' },
          { label:'Almacenamiento BESS',   val: formatMW(pt.bess),             color:'text-cyan-700',    bg:'bg-cyan-50',    border:'border-cyan-200' },
        ].map(k=>(
          <div key={k.label} className={`rounded-lg ${k.bg} border ${k.border} p-4 shadow-sm`}>
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className={`text-xl font-bold ${k.color}`}>{k.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie por tecnología */}
        <SectionCard
          titulo="Mix de Capacidad Instalada"
          subtitulo={`${tecnologia.mes} ${tecnologia.anio} — Total: ${formatMW(tecnologia.totalMW)}`}
          fuente="CNE Energía Abierta — Reporte Mensual Sector Energético"
        >
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={48} outerRadius={82} paddingAngle={2} dataKey="value"
                  label={(props:any)=>{
                    const {cx,cy,midAngle,outerRadius,percent}=props;
                    if((percent??0)<0.03) return null;
                    const R=Math.PI/180, r=outerRadius+20;
                    const x=cx+r*Math.cos(-midAngle*R), y=cy+r*Math.sin(-midAngle*R);
                    return <text x={x} y={y} textAnchor={x>cx?'start':'end'} dominantBaseline="central" style={{fontSize:9,fill:'#374151',fontWeight:600}}>{`${((percent??0)*100).toFixed(1)}%`}</text>;
                  }} labelLine={false}
                >
                  {pieData.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip content={({active,payload})=>{
                  if(!active||!payload?.length) return null;
                  const d=payload[0].payload;
                  return <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow"><div className="font-semibold text-gray-800">{d.name}</div><div className="text-gray-500">{formatMW(d.value)}</div><div className="text-blue-600 font-bold">{formatPorcentaje(d.value/tecnologia.totalMW*100)}</div></div>;
                }}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 mt-1">
            {pieData.slice(0,8).map(d=>(
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:d.color}}/><span className="text-gray-600 truncate">{d.name}</span></div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-gray-400 text-[10px]">{formatMW(d.value)}</span>
                  <span className="font-bold text-gray-800 w-11 text-right">{formatPorcentaje(d.value/tecnologia.totalMW*100)}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Barras por región */}
        <SectionCard
          titulo="Capacidad Instalada por Región"
          subtitulo="Top 10 regiones — desglose por tecnología (MW)"
          fuente="CEN — Reporte Energético · CNE Energía Abierta"
          className="lg:col-span-2"
        >
          <div className="h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionData} layout="vertical" margin={{top:5,right:60,left:90,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false}/>
                <XAxis type="number" tickFormatter={v=>`${v}`} tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis dataKey="name" type="category" tick={{fill:'#6b7280',fontSize:10}} axisLine={false} tickLine={false} width={88}/>
                <Tooltip content={({active,payload,label})=>{
                  if(!active||!payload?.length) return null;
                  const total = (payload as any[]).reduce((s:number,p:any)=>s+(p.value||0),0);
                  return (
                    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-lg">
                      <p className="font-semibold text-gray-800 mb-2">{label}</p>
                      {(payload as any[]).reverse().filter(p=>p.value>0).map((p:any,i:number)=>(
                        <div key={i} className="flex justify-between gap-4 mb-0.5">
                          <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:p.color}}/><span className="text-gray-500">{p.name}:</span></div>
                          <span className="font-medium text-gray-800">{formatMW(p.value)}</span>
                        </div>
                      ))}
                      <div className="border-t border-gray-100 mt-2 pt-2 font-bold text-blue-700">Total: {formatMW(total)}</div>
                    </div>
                  );
                }}/>
                <Legend formatter={v=><span className="text-xs text-gray-500">{v}</span>}/>
                {Object.entries(COLORES_REG).map(([name, color])=>(
                  <Bar key={name} dataKey={name} stackId="a" fill={color} radius={name==='Otros'?[0,4,4,0]:undefined}/>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Tabla detalle tecnologías */}
      <SectionCard
        titulo="Capacidad Instalada por Tecnología — Detalle"
        subtitulo={`Sistema Eléctrico Nacional — ${tecnologia.mes} ${tecnologia.anio}`}
        fuente="CNE Energía Abierta — Reporte Mensual Sector Energético · CEN Reporte Energético"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-gray-500 border-b border-gray-200">
                <th className="text-left py-2 font-medium">Tecnología</th>
                <th className="text-right py-2 font-medium">MW</th>
                <th className="text-right py-2 font-medium">% Total</th>
                <th className="text-right py-2 font-medium">GW</th>
                <th className="text-left py-2 pl-4 font-medium">Barra</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {TECHS_CAP.filter(t=>pt[t]>0).sort((a,b)=>pt[b]-pt[a]).map(t=>{
                const pct = pt[t]/tecnologia.totalMW*100;
                return (
                  <tr key={t} className="text-gray-700 hover:bg-gray-50 transition-colors">
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{backgroundColor:COLORES_TECNOLOGIA[t]||'#6B7280'}}/>
                        <span className="font-medium">{NOMBRES_TECNOLOGIA[t]||t}</span>
                      </div>
                    </td>
                    <td className="py-2 text-right font-medium text-gray-900">{pt[t].toLocaleString('es-CL')}</td>
                    <td className="py-2 text-right text-blue-600 font-bold">{pct.toFixed(1)}%</td>
                    <td className="py-2 text-right text-gray-500">{(pt[t]/1000).toFixed(2)}</td>
                    <td className="py-2 pl-4">
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all" style={{width:`${Math.min(pct*3,100)}%`, backgroundColor:COLORES_TECNOLOGIA[t]||'#6B7280'}}/>
                      </div>
                    </td>
                  </tr>
                );
              })}
              <tr className="text-gray-900 border-t-2 border-gray-300 font-bold">
                <td className="py-2">TOTAL SEN</td>
                <td className="py-2 text-right">{tecnologia.totalMW.toLocaleString('es-CL')}</td>
                <td className="py-2 text-right text-blue-700">100,0%</td>
                <td className="py-2 text-right">{(tecnologia.totalMW/1000).toFixed(2)}</td>
                <td className="py-2"/>
              </tr>
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
