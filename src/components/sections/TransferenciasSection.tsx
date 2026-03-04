'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import SectionCard from '@/components/ui/SectionCard';
import { formatCLP, formatPorcentaje, COLORES_TECNOLOGIA, NOMBRES_TECNOLOGIA } from '@/lib/utils';
import type { TransferenciasEconomicas, SSCCPago, SSCCUnidad, PotenciaTecnologia } from '@/lib/types';

const TECHS_POT = ['hidro','termicaGas','termicaCarbon','termicaDiesel','solar','eolica','geotermica','bess','otros'] as const;

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, p: any) => s + (p.value||0), 0);
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-lg">
      <p className="text-gray-700 font-semibold mb-2">{label}</p>
      {[...payload].reverse().filter((p:any)=>p.value>0).map((p:any,i:number)=>(
        <div key={i} className="flex items-center justify-between gap-3 text-gray-500 mb-0.5">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{backgroundColor:p.color}}/><span>{p.name}:</span></div>
          <div className="flex items-center gap-2">
            <span className="text-gray-800 font-medium">{formatCLP(p.value)}</span>
            {total>0 && <span className="text-gray-400">{(p.value/total*100).toFixed(1)}%</span>}
          </div>
        </div>
      ))}
      {total>0 && <div className="border-t border-gray-100 mt-1 pt-1 font-bold text-blue-700">Total: {formatCLP(total)}</div>}
    </div>
  );
};

export default function TransferenciasSection({
  transferencias, ssccPagos, ssccUnidades, potencia
}: {
  transferencias: TransferenciasEconomicas[];
  ssccPagos: SSCCPago[];
  ssccUnidades: SSCCUnidad[];
  potencia: PotenciaTecnologia[];
}) {
  const ult = transferencias[transferencias.length-1];
  const ultSSCC = ssccPagos[ssccPagos.length-1];

  // Pie compensaciones por tipo de estabilización
  const pieEstab = [
    { name:'Decreto 244',  value:ult.compensacionDecreto244CLP,  color:'#6366F1' },
    { name:'Decreto 88',   value:ult.compensacionDecreto88CLP,   color:'#EC4899' },
    { name:'Costo Marginal', value:ult.compensacionCostoMarginalCLP, color:'#F59E0B' },
  ];

  // Pie potencia por tecnología último mes
  const piePot = TECHS_POT.filter(t=>ult.potenciaPorTecnologia[t]>0).map(t=>({
    name: NOMBRES_TECNOLOGIA[t]||t,
    value: ult.potenciaPorTecnologia[t],
    color: COLORES_TECNOLOGIA[t]||'#6B7280',
  }));

  // Evolución resumen total transferencias
  const evTotal = transferencias.slice(-12).map(t=>({
    name: t.mes,
    'Potencia': t.potenciaTotalCLP,
    'SSCC': t.ssccTotalCLP,
    'P. Estabilizado': t.compensacionPrecioEstabilizadoCLP,
    'P. Laterales': t.pagosLateralesCLP,
  }));

  // Potencia por tecnología histórico
  const potHist = transferencias.slice(-12).map(t=>({
    name: t.mes,
    ...TECHS_POT.reduce((a,tech)=>({...a,[NOMBRES_TECNOLOGIA[tech]||tech]:t.potenciaPorTecnologia[tech]}),{} as Record<string,number>),
  }));

  // SSCC tipos
  const TIPOS_SSCC = ['regulacionFrecuencia','regulacionTension','arranqueSinRed','potenciaReactiva','reservaGiro','otros'] as const;
  const LABELS_SSCC: Record<string,string> = {regulacionFrecuencia:'Reg. Frecuencia',regulacionTension:'Reg. Tensión',arranqueSinRed:'Arranque Sin Red',potenciaReactiva:'Pot. Reactiva',reservaGiro:'Reserva Giro',otros:'Otros'};
  const COLORS_SSCC = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#6B7280'];
  const ssccHist = ssccPagos.slice(-12).map(p=>({
    name:p.mes,
    ...TIPOS_SSCC.reduce((a,k,i)=>({...a,[LABELS_SSCC[k]]:p.porTipo[k]}),{} as Record<string,number>),
  }));

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:`Total Transferencias ${ult.mes} ${ult.anio}`, val: formatCLP(ult.totalTransferenciasCLP),             color:'text-blue-700',    bg:'bg-blue-50',    border:'border-blue-200' },
          { label:'Potencia de Suficiencia',                       val: formatCLP(ult.potenciaTotalCLP),                  color:'text-indigo-700',  bg:'bg-indigo-50',  border:'border-indigo-200' },
          { label:'SSCC Total',                                    val: formatCLP(ult.ssccTotalCLP),                     color:'text-amber-700',   bg:'bg-amber-50',   border:'border-amber-200' },
          { label:'Precio Estabilizado PMGD',                     val: formatCLP(ult.compensacionPrecioEstabilizadoCLP), color:'text-violet-700',  bg:'bg-violet-50',  border:'border-violet-200' },
        ].map(k=>(
          <div key={k.label} className={`rounded-lg ${k.bg} border ${k.border} p-4 shadow-sm`}>
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className={`text-xl font-bold ${k.color}`}>{k.val}</div>
          </div>
        ))}
      </div>

      {/* Evolución total transferencias */}
      <SectionCard
        titulo="Evolución Total Transferencias Económicas"
        subtitulo="Últimos 12 meses — desglose por componente (CLP)"
        fuente="CEN PLABACOM — Plataforma Balance Comercial · coordinador.cl"
      >
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={evTotal} margin={{top:5,right:10,left:10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
              <XAxis dataKey="name" tick={{fill:'#6b7280',fontSize:11}} axisLine={{stroke:'#d1d5db'}} tickLine={false}/>
              <YAxis tickFormatter={v=>formatCLP(v)} tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false} width={82}/>
              <Tooltip content={<TT/>}/>
              <Legend formatter={v=><span className="text-xs text-gray-500">{v}</span>}/>
              <Bar dataKey="Potencia"       stackId="a" fill="#6366F1" />
              <Bar dataKey="SSCC"           stackId="a" fill="#F59E0B" />
              <Bar dataKey="P. Estabilizado" stackId="a" fill="#EC4899"/>
              <Bar dataKey="P. Laterales"   stackId="a" fill="#9CA3AF" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compensación estabilización precio */}
        <SectionCard
          titulo="Compensación Precio Estabilizado PMGD"
          subtitulo={`${ult.mes} ${ult.anio} — Total: ${formatCLP(ult.compensacionPrecioEstabilizadoCLP)}`}
          fuente="CEN PLABACOM — Factores Referenciación PMGD (D.244 / D.88 / C.Marginal)"
        >
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieEstab} cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={3} dataKey="value"
                  label={(props:any)=>{
                    const {cx,cy,midAngle,outerRadius,percent}=props;
                    if((percent??0)<0.05) return null;
                    const R=Math.PI/180, r=outerRadius+18;
                    const x=cx+r*Math.cos(-midAngle*R), y=cy+r*Math.sin(-midAngle*R);
                    return <text x={x} y={y} textAnchor={x>cx?'start':'end'} dominantBaseline="central" style={{fontSize:10,fill:'#374151',fontWeight:700}}>{`${((percent??0)*100).toFixed(0)}%`}</text>;
                  }} labelLine={false}
                >
                  {pieEstab.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Legend formatter={v=><span className="text-xs text-gray-500">{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {pieEstab.map(d=>(
              <div key={d.name} className="rounded-lg p-3 border border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2 mb-1"><span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor:d.color}}/><span className="text-xs font-semibold text-gray-700">{d.name}</span></div>
                <div className="text-base font-bold text-gray-900">{formatCLP(d.value)}</div>
                <div className="text-xs text-gray-400">{formatPorcentaje(d.value/ult.compensacionPrecioEstabilizadoCLP*100)}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Potencia por tecnología */}
        <SectionCard
          titulo="Potencia de Suficiencia por Tecnología"
          subtitulo={`${ult.mes} ${ult.anio} — Total: ${formatCLP(ult.potenciaTotalCLP)}`}
          fuente="CEN PLABACOM — Balance Mensual Potencia de Suficiencia"
          className="lg:col-span-2"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={piePot} cx="50%" cy="50%" innerRadius={42} outerRadius={72} paddingAngle={2} dataKey="value"
                    label={(props:any)=>{
                      const {cx,cy,midAngle,outerRadius,percent}=props;
                      if((percent??0)<0.04) return null;
                      const R=Math.PI/180, r=outerRadius+18;
                      const x=cx+r*Math.cos(-midAngle*R), y=cy+r*Math.sin(-midAngle*R);
                      return <text x={x} y={y} textAnchor={x>cx?'start':'end'} dominantBaseline="central" style={{fontSize:9,fill:'#374151',fontWeight:600}}>{`${((percent??0)*100).toFixed(0)}%`}</text>;
                    }} labelLine={false}
                  >
                    {piePot.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Tooltip content={({active,payload})=>{
                    if(!active||!payload?.length) return null;
                    const d=payload[0].payload;
                    return <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow"><div className="font-semibold">{d.name}</div><div className="text-blue-600">{formatCLP(d.value)}</div><div className="text-gray-500">{formatPorcentaje(d.value/ult.potenciaTotalCLP*100)}</div></div>;
                  }}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5">
              {piePot.sort((a,b)=>b.value-a.value).map(d=>(
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:d.color}}/><span className="text-gray-600 truncate">{d.name}</span></div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-gray-400 text-[10px]">{formatCLP(d.value)}</span>
                    <span className="font-bold text-gray-800 w-10 text-right">{formatPorcentaje(d.value/ult.potenciaTotalCLP*100)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>

      {/* Evolución potencia por tecnología */}
      <SectionCard
        titulo="Pagos Potencia de Suficiencia por Tecnología"
        subtitulo="Últimos 12 meses — CLP"
        fuente="CEN PLABACOM — Balance Mensual Potencia de Suficiencia (disponible desde May-2025)"
      >
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={potHist} margin={{top:5,right:10,left:10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
              <XAxis dataKey="name" tick={{fill:'#6b7280',fontSize:11}} axisLine={{stroke:'#d1d5db'}} tickLine={false}/>
              <YAxis tickFormatter={v=>formatCLP(v)} tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false} width={82}/>
              <Tooltip content={<TT/>}/>
              <Legend formatter={v=><span className="text-xs text-gray-500">{v}</span>}/>
              {TECHS_POT.filter(t=>ult.potenciaPorTecnologia[t]>0).map(t=>(
                <Bar key={t} dataKey={NOMBRES_TECNOLOGIA[t]||t} stackId="a" fill={COLORES_TECNOLOGIA[t]||'#6B7280'}/>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* SSCC */}
      <SectionCard
        titulo="Pagos Servicios Complementarios (SSCC)"
        subtitulo="Últimos 12 meses — por tipo de servicio"
        fuente="CEN PLABACOM — Balance de Servicios Complementarios"
      >
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ssccHist} margin={{top:5,right:10,left:10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
              <XAxis dataKey="name" tick={{fill:'#6b7280',fontSize:11}} axisLine={{stroke:'#d1d5db'}} tickLine={false}/>
              <YAxis tickFormatter={v=>formatCLP(v)} tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false} width={82}/>
              <Tooltip content={<TT/>}/>
              <Legend formatter={v=><span className="text-xs text-gray-500">{v}</span>}/>
              {TIPOS_SSCC.map((k,i)=>(
                <Bar key={k} dataKey={LABELS_SSCC[k]} stackId="a" fill={COLORS_SSCC[i]} radius={i===TIPOS_SSCC.length-1?[4,4,0,0]:undefined}/>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
