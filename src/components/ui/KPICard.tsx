'use client';

interface KPICardProps {
  titulo: string;
  valor: string;
  subtitulo?: string;
  icono: React.ReactNode;
  color?: 'azul' | 'verde' | 'amarillo' | 'violeta' | 'rojo' | 'cyan';
  tendencia?: { valor: number; etiqueta: string };
}

const colores = {
  azul:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/30',    icon: 'text-blue-400',    val: 'text-blue-300'    },
  verde:   { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', icon: 'text-emerald-400', val: 'text-emerald-300' },
  amarillo:{ bg: 'bg-amber-500/10',   border: 'border-amber-500/30',   icon: 'text-amber-400',   val: 'text-amber-300'   },
  violeta: { bg: 'bg-violet-500/10',  border: 'border-violet-500/30',  icon: 'text-violet-400',  val: 'text-violet-300'  },
  rojo:    { bg: 'bg-rose-500/10',    border: 'border-rose-500/30',    icon: 'text-rose-400',    val: 'text-rose-300'    },
  cyan:    { bg: 'bg-cyan-500/10',    border: 'border-cyan-500/30',    icon: 'text-cyan-400',    val: 'text-cyan-300'    },
};

export default function KPICard({ titulo, valor, subtitulo, icono, color = 'azul', tendencia }: KPICardProps) {
  const c = colores[color];
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5 flex flex-col gap-3 backdrop-blur-sm`}>
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-slate-400 leading-tight">{titulo}</span>
        <span className={`${c.icon} text-xl`}>{icono}</span>
      </div>
      <div>
        <div className={`text-2xl font-bold ${c.val}`}>{valor}</div>
        {subtitulo && <div className="text-xs text-slate-500 mt-1">{subtitulo}</div>}
      </div>
      {tendencia && (
        <div className={`text-xs flex items-center gap-1 ${tendencia.valor >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
          <span>{tendencia.valor >= 0 ? '▲' : '▼'}</span>
          <span>{Math.abs(tendencia.valor).toFixed(1)}% {tendencia.etiqueta}</span>
        </div>
      )}
    </div>
  );
}
