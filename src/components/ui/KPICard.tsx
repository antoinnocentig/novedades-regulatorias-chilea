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
  azul:    { bg: 'bg-blue-50',    border: 'border-blue-200',    icon: 'text-blue-500',    val: 'text-blue-700'    },
  verde:   { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'text-emerald-500', val: 'text-emerald-700' },
  amarillo:{ bg: 'bg-amber-50',   border: 'border-amber-200',   icon: 'text-amber-500',   val: 'text-amber-700'   },
  violeta: { bg: 'bg-violet-50',  border: 'border-violet-200',  icon: 'text-violet-500',  val: 'text-violet-700'  },
  rojo:    { bg: 'bg-rose-50',    border: 'border-rose-200',    icon: 'text-rose-500',    val: 'text-rose-700'    },
  cyan:    { bg: 'bg-cyan-50',    border: 'border-cyan-200',    icon: 'text-cyan-500',    val: 'text-cyan-700'    },
};

export default function KPICard({ titulo, valor, subtitulo, icono, color = 'azul', tendencia }: KPICardProps) {
  const c = colores[color];
  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} p-5 flex flex-col gap-3 shadow-sm`}>
      <div className="flex items-start justify-between">
        <span className="text-sm font-medium text-gray-600 leading-tight">{titulo}</span>
        <span className={`${c.icon} text-xl`}>{icono}</span>
      </div>
      <div>
        <div className={`text-2xl font-bold ${c.val}`}>{valor}</div>
        {subtitulo && <div className="text-xs text-gray-400 mt-1">{subtitulo}</div>}
      </div>
      {tendencia && (
        <div className={`text-xs flex items-center gap-1 ${tendencia.valor >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
          <span>{tendencia.valor >= 0 ? '▲' : '▼'}</span>
          <span>{Math.abs(tendencia.valor).toFixed(1)}% {tendencia.etiqueta}</span>
        </div>
      )}
    </div>
  );
}
