'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import SectionCard from '@/components/ui/SectionCard';
import { formatCLP, formatMW, formatPorcentaje, COLORES_TECNOLOGIA, NOMBRES_TECNOLOGIA } from '@/lib/utils';
import type { PMGDCapacidad, PMGDCompensacionMensual, PMGDEstabilizacion } from '@/lib/types';

const COLORES_ESTAB = ['#6366F1', '#EC4899', '#F59E0B'];

const TT = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-3 text-xs shadow-xl">
      <p className="text-slate-300 font-medium mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-slate-400">
          <span className="w-2 h-2 rounded-full" style={{backgroundColor:p.color}} />
          <span>{p.name}:</span>
          <span className="text-white font-medium">{formatCLP(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function PMGDSection({ capacidad, compensaciones, estabilizacion }: { capacidad: PMGDCapacidad; compensaciones: PMGDCompensacionMensual[]; estabilizacion: PMGDEstabilizacion[] }) {
  const pieCapacidad = Object.entries(capacidad.porTecnologia).filter(([,v])=>v>0).map(([k,v])=>({ name: NOMBRES_TECNOLOGIA[k]||k, value:v, color: COLORES_TECNOLOGIA[k]||'#6B7280' }));
  const compData = compensaciones.slice(-12).map(c=>({ name:`${c.mes}`, mes:c.mes, 'Costo Sistémico':c.costoSistemicoCLP }));
  const ultimoEstab = estabilizacion[estabilizacion.length-1];
  const estabPie = ultimoEstab ? [
    { name:'Decreto 244', value:ultimoEstab.decreto244.montoCLP, color:COLORES_ESTAB[0] },
    { name:'Decreto 88',  value:ultimoEstab.decreto88.montoCLP,  color:COLORES_ESTAB[1] },
    { name:'Costo Marginal', value:ultimoEstab.costoMarginal.montoCLP, color:COLORES_ESTAB[2] },
  ] : [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Capacidad instalada */}
        <SectionCard titulo="Capacidad Instalada PMGD" subtitulo={`Al ${capacidad.fechaDato} — ${capacidad.cantidadProyectos.toLocaleString('es-CL')} proyectos`}>
          <div className="text-3xl font-bold text-blue-300 mb-4">{formatMW(capacidad.totalMW)}</div>
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieCapacidad} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2} dataKey="value">
                  {pieCapacidad.map((e,i)=><Cell key={i} fill={e.color}/>)}
                </Pie>
                <Tooltip content={({active,payload})=>{
                  if(!active||!payload?.length) return null;
                  const d=payload[0].payload;
                  return <div className="bg-slate-900/95 border border-slate-700 rounded-lg p-2 text-xs"><div className="font-medium text-white">{d.name}</div><div className="text-slate-300">{formatMW(d.value)}</div><div className="text-slate-400">{formatPorcentaje(d.value/capacidad.totalMW*100)}</div></div>;
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {pieCapacidad.map(d=>(
              <div key={d.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{backgroundColor:d.color}}/><span className="text-slate-400">{d.name}</span></div>
                <span className="text-slate-200 font-medium">{formatMW(d.value)}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Compensaciones mensuales */}
        <SectionCard titulo="Costo Sistémico PMGD Mensual" subtitulo="Pagos compensaciones a distribuidoras — últimos 12 meses" className="lg:col-span-2">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={compData} margin={{top:5,right:10,left:10,bottom:5}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                <XAxis dataKey="mes" tick={{fill:'#94a3b8',fontSize:11}} axisLine={{stroke:'#334155'}} tickLine={false}/>
                <YAxis tickFormatter={v=>formatCLP(v)} tick={{fill:'#94a3b8',fontSize:10}} axisLine={false} tickLine={false} width={80}/>
                <Tooltip content={<TT/>}/>
                <Bar dataKey="Costo Sistémico" fill="#6366F1" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      </div>

      {/* Estabilización */}
      <SectionCard titulo="Compensaciones por Tipo de Estabilización de Precio" subtitulo={ultimoEstab ? `${ultimoEstab.mes} ${ultimoEstab.anio} — Total: ${formatCLP(ultimoEstab.totalCLP)} — Decreto 244 / Decreto 88 / Costo Marginal` : ''}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex flex-col items-center">
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={estabPie} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                    {estabPie.map((e,i)=><Cell key={i} fill={e.color}/>)}
                  </Pie>
                  <Legend formatter={v=><span className="text-xs text-slate-400">{v}</span>}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ultimoEstab && (<>
              <div className="rounded-lg bg-indigo-500/10 border border-indigo-500/30 p-4">
                <div className="text-xs text-indigo-400 font-medium mb-1">Decreto 244</div>
                <div className="text-xl font-bold text-indigo-300">{formatCLP(ultimoEstab.decreto244.montoCLP)}</div>
                <div className="text-xs text-slate-500 mt-1">{formatPorcentaje(ultimoEstab.decreto244.porcentaje)} del total</div>
                <div className="text-xs text-slate-500">{(ultimoEstab.decreto244.energiaKWh/1e6).toFixed(1)} GWh</div>
              </div>
              <div className="rounded-lg bg-pink-500/10 border border-pink-500/30 p-4">
                <div className="text-xs text-pink-400 font-medium mb-1">Decreto 88</div>
                <div className="text-xl font-bold text-pink-300">{formatCLP(ultimoEstab.decreto88.montoCLP)}</div>
                <div className="text-xs text-slate-500 mt-1">{formatPorcentaje(ultimoEstab.decreto88.porcentaje)} del total</div>
                <div className="text-xs text-slate-500">{(ultimoEstab.decreto88.energiaKWh/1e6).toFixed(1)} GWh</div>
              </div>
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-4">
                <div className="text-xs text-amber-400 font-medium mb-1">Costo Marginal</div>
                <div className="text-xl font-bold text-amber-300">{formatCLP(ultimoEstab.costoMarginal.montoCLP)}</div>
                <div className="text-xs text-slate-500 mt-1">{formatPorcentaje(ultimoEstab.costoMarginal.porcentaje)} del total</div>
                <div className="text-xs text-slate-500">{(ultimoEstab.costoMarginal.energiaKWh/1e6).toFixed(1)} GWh</div>
              </div>
            </>)}
          </div>
        </div>
        {/* Evolución histórica */}
        <div className="mt-6 h-[200px]">
          <p className="text-xs text-slate-500 mb-3">Evolución mensual por tipo de estabilización</p>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={estabilizacion.slice(-12).map(e=>({ name:e.mes, 'D.244':e.decreto244.montoCLP, 'D.88':e.decreto88.montoCLP, 'C.Marginal':e.costoMarginal.montoCLP }))} margin={{top:5,right:10,left:10,bottom:5}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
              <XAxis dataKey="name" tick={{fill:'#94a3b8',fontSize:10}} axisLine={{stroke:'#334155'}} tickLine={false}/>
              <YAxis tickFormatter={v=>formatCLP(v)} tick={{fill:'#94a3b8',fontSize:9}} axisLine={false} tickLine={false} width={75}/>
              <Tooltip content={<TT/>}/>
              <Bar dataKey="D.244" stackId="a" fill={COLORES_ESTAB[0]}/>
              <Bar dataKey="D.88" stackId="a" fill={COLORES_ESTAB[1]}/>
              <Bar dataKey="C.Marginal" stackId="a" fill={COLORES_ESTAB[2]} radius={[4,4,0,0]}/>
              <Legend formatter={v=><span className="text-xs text-slate-400">{v}</span>}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>
    </div>
  );
}
