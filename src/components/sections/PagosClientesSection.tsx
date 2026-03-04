'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import SectionCard from '@/components/ui/SectionCard';
import { formatCLP, formatCLPkWh, formatUSDMWh, formatPorcentaje, COLORES_CLIENTE, COLORES_CARGO } from '@/lib/utils';
import type { PagosClientesMes } from '@/lib/types';

const TIPOS_CLIENTE = [
  { key: 'reguladoBT'   as const, label: 'Regulado BT' },
  { key: 'reguladoAT'   as const, label: 'Regulado AT' },
  { key: 'libreGrande'  as const, label: 'Libre Grande' },
  { key: 'libreMediano' as const, label: 'Libre Mediano' },
];

const CARGOS = [
  { key: 'energia'           as const, label: 'Energía' },
  { key: 'potencia'          as const, label: 'Potencia' },
  { key: 'transmision'       as const, label: 'Transmisión' },
  { key: 'distribucion'      as const, label: 'Distribución' },
  { key: 'cargosAdicionales' as const, label: 'Cargos Adic.' },
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
            <span className="text-gray-800 font-medium">{formatCLP(p.value)}</span>
            {total>0 && <span className="text-gray-400">{(p.value/total*100).toFixed(1)}%</span>}
          </div>
        </div>
      ))}
      <div className="border-t border-gray-100 mt-1 pt-1 font-bold text-blue-700">Total: {formatCLP(total)}</div>
    </div>
  );
};

export default function PagosClientesSection({ datos }: { datos: PagosClientesMes[] }) {
  const ult = datos[datos.length-1];
  const totalPie = ult.totalFacturadoCLP;

  const pieClientes = TIPOS_CLIENTE.map(t=>({ name:t.label, value:ult.porTipoCliente[t.key], color:COLORES_CLIENTE[t.key] }));
  const pieCargos   = CARGOS.map(c=>({ name:c.label, value:ult.distribucionCargos[c.key], color:COLORES_CARGO[c.key] }));

  const barClientes = datos.slice(-12).map(d=>({
    name:d.mes,
    ...TIPOS_CLIENTE.reduce((a,t)=>({...a,[t.label]:d.porTipoCliente[t.key]}),{} as Record<string,number>),
  }));

  const precios = datos.slice(-12).map(d=>({
    name:d.mes,
    'Residencial (CLP/kWh)': d.preciosPromedio.residencial_CLPkWh,
    'Industrial (CLP/kWh)':  d.preciosPromedio.industrial_CLPkWh,
    'Minería (CLP/kWh)':     d.preciosPromedio.minero_CLPkWh,
    'Nudo CP (USD/MWh)':     d.preciosPromedio.precioNudoCortoPlazo_USDMWh,
  }));

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label:`Facturación Total ${ult.mes} ${ult.anio}`, val: formatCLP(ult.totalFacturadoCLP),          color:'text-blue-700',    bg:'bg-blue-50',    border:'border-blue-200' },
          { label:'Tarifa Residencial (BT)',                   val: formatCLPkWh(ult.preciosPromedio.residencial_CLPkWh), color:'text-emerald-700', bg:'bg-emerald-50', border:'border-emerald-200' },
          { label:'Tarifa Industrial AT',                      val: formatCLPkWh(ult.preciosPromedio.industrial_CLPkWh),  color:'text-amber-700',   bg:'bg-amber-50',   border:'border-amber-200' },
          { label:'Precio Nudo Corto Plazo',                   val: formatUSDMWh(ult.preciosPromedio.precioNudoCortoPlazo_USDMWh), color:'text-violet-700', bg:'bg-violet-50', border:'border-violet-200' },
        ].map(k=>(
          <div key={k.label} className={`rounded-lg ${k.bg} border ${k.border} p-4 shadow-sm`}>
            <div className="text-xs text-gray-500 mb-1">{k.label}</div>
            <div className={`text-xl font-bold ${k.color}`}>{k.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Distribución por tipo de cliente (pie) */}
        <SectionCard
          titulo="Facturación por Tipo de Cliente"
          subtitulo={`${ult.mes} ${ult.anio} — Total: ${formatCLP(totalPie)}`}
          fuente="CNE — Informe Financiero Sector Energético"
        >
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieClientes} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value"
                  label={(props:any)=>{
                    const {cx,cy,midAngle,outerRadius,percent}=props;
                    if((percent??0)<0.05) return null;
                    const R=Math.PI/180, r=outerRadius+18;
                    const x=cx+r*Math.cos(-midAngle*R), y=cy+r*Math.sin(-midAngle*R);
                    return <text x={x} y={y} textAnchor={x>cx?'start':'end'} dominantBaseline="central" style={{fontSize:10,fill:'#374151',fontWeight:600}}>{`${((percent??0)*100).toFixed(0)}%`}</text>;
                  }} labelLine={false}
                >
                  {pieClientes.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip content={({active,payload})=>{
                  if(!active||!payload?.length) return null;
                  const d=payload[0].payload;
                  return <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow"><div className="font-semibold">{d.name}</div><div className="text-blue-600">{formatCLP(d.value)}</div><div className="text-gray-500">{formatPorcentaje(d.value/totalPie*100)}</div></div>;
                }}/>
                <Legend formatter={v=><span className="text-xs text-gray-500">{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-1">
            {TIPOS_CLIENTE.map(t=>{
              const v=ult.porTipoCliente[t.key];
              return (
                <div key={t.key} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:COLORES_CLIENTE[t.key]}}/><span className="text-gray-600">{t.label}</span></div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-[10px]">{formatCLP(v)}</span>
                    <span className="font-bold text-gray-800 w-11 text-right">{formatPorcentaje(v/totalPie*100)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>

        {/* Distribución de cargos (pie) */}
        <SectionCard
          titulo="Distribución de Cargos en Tarifa Final"
          subtitulo={`Cliente regulado BT — ${ult.mes} ${ult.anio}`}
          fuente="CNE — Rex. N°3-2025 Peajes Distribución · Informe Financiero"
        >
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieCargos} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value"
                  label={(props:any)=>{
                    const {cx,cy,midAngle,outerRadius,percent}=props;
                    if((percent??0)<0.04) return null;
                    const R=Math.PI/180, r=outerRadius+18;
                    const x=cx+r*Math.cos(-midAngle*R), y=cy+r*Math.sin(-midAngle*R);
                    return <text x={x} y={y} textAnchor={x>cx?'start':'end'} dominantBaseline="central" style={{fontSize:10,fill:'#374151',fontWeight:600}}>{`${((percent??0)*100).toFixed(0)}%`}</text>;
                  }} labelLine={false}
                >
                  {pieCargos.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip content={({active,payload})=>{
                  if(!active||!payload?.length) return null;
                  const d=payload[0].payload;
                  return <div className="bg-white border border-gray-200 rounded-lg p-2 text-xs shadow"><div className="font-semibold">{d.name}</div><div className="text-blue-600">{formatCLP(d.value)}</div><div className="text-gray-500">{formatPorcentaje(d.value/totalPie*100)}</div></div>;
                }}/>
                <Legend formatter={v=><span className="text-xs text-gray-500">{v}</span>}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-1">
            {CARGOS.map(c=>{
              const v=ult.distribucionCargos[c.key];
              return (
                <div key={c.key} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:COLORES_CARGO[c.key]}}/><span className="text-gray-600">{c.label}</span></div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 text-[10px]">{formatCLP(v)}</span>
                    <span className="font-bold text-gray-800 w-11 text-right">{formatPorcentaje(v/totalPie*100)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>

      {/* Evolución facturación por tipo de cliente */}
      <SectionCard
        titulo="Facturación Mensual por Tipo de Cliente"
        subtitulo="Últimos 12 meses — CLP"
        fuente="CNE — Informe Financiero del Sector Energético"
      >
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barClientes} margin={{top:5,right:10,left:10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
              <XAxis dataKey="name" tick={{fill:'#6b7280',fontSize:11}} axisLine={{stroke:'#d1d5db'}} tickLine={false}/>
              <YAxis tickFormatter={v=>formatCLP(v)} tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false} width={82}/>
              <Tooltip content={<TT/>}/>
              <Legend formatter={v=><span className="text-xs text-gray-500">{v}</span>}/>
              {TIPOS_CLIENTE.map((t,i)=>(
                <Bar key={t.key} dataKey={t.label} stackId="a" fill={COLORES_CLIENTE[t.key]} radius={i===TIPOS_CLIENTE.length-1?[4,4,0,0]:undefined}/>
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Precios de energía */}
      <SectionCard
        titulo="Precios de Energía"
        subtitulo="Tarifas reguladas y precio nudo de corto plazo — últimos 12 meses"
        fuente="CNE — Precio Nudo Corto Plazo · Rex. Tarifas Vigentes · Informe Financiero"
      >
        <div className="h-[220px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={precios} margin={{top:5,right:10,left:10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb"/>
              <XAxis dataKey="name" tick={{fill:'#6b7280',fontSize:11}} axisLine={{stroke:'#d1d5db'}} tickLine={false}/>
              <YAxis yAxisId="clp" domain={[50,200]} tickFormatter={v=>`${v}`} tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false} width={40} label={{value:'CLP/kWh',angle:-90,position:'insideLeft',fontSize:9,fill:'#9ca3af'}}/>
              <YAxis yAxisId="usd" orientation="right" domain={[40,120]} tickFormatter={v=>`${v}`} tick={{fill:'#9ca3af',fontSize:9}} axisLine={false} tickLine={false} width={44} label={{value:'USD/MWh',angle:90,position:'insideRight',fontSize:9,fill:'#9ca3af'}}/>
              <Tooltip content={({active,payload,label})=>{
                if(!active||!payload?.length) return null;
                return <div className="bg-white border border-gray-200 rounded-lg p-3 text-xs shadow-lg">
                  <p className="font-semibold text-gray-800 mb-2">{label}</p>
                  {(payload as any[]).map((p:any,i:number)=>(
                    <div key={i} className="flex items-center justify-between gap-3 mb-0.5">
                      <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{backgroundColor:p.color}}/><span className="text-gray-500">{p.name}:</span></div>
                      <span className="font-medium text-gray-800">{p.value} {p.dataKey.includes('USD') ? 'USD/MWh' : 'CLP/kWh'}</span>
                    </div>
                  ))}
                </div>;
              }}/>
              <Legend formatter={v=><span className="text-xs text-gray-500">{v}</span>}/>
              <Line yAxisId="clp" type="monotone" dataKey="Residencial (CLP/kWh)" stroke="#10B981" strokeWidth={2} dot={false}/>
              <Line yAxisId="clp" type="monotone" dataKey="Industrial (CLP/kWh)"  stroke="#6366F1" strokeWidth={2} dot={false}/>
              <Line yAxisId="clp" type="monotone" dataKey="Minería (CLP/kWh)"     stroke="#F59E0B" strokeWidth={2} dot={false}/>
              <Line yAxisId="usd" type="monotone" dataKey="Nudo CP (USD/MWh)"     stroke="#EF4444" strokeWidth={1.5} dot={false} strokeDasharray="4 2"/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
