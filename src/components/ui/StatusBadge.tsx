'use client';
import type { EstadoFuente } from '@/lib/types';

export default function StatusBadge({ fuente }: { fuente: EstadoFuente }) {
  const cfg = {
    ok:       { c: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400', label: 'Activo'     },
    fallback: { c: 'bg-amber-500/20  text-amber-400  border-amber-500/30',  dot: 'bg-amber-400',  label: 'Referencia' },
    error:    { c: 'bg-rose-500/20   text-rose-400   border-rose-500/30',   dot: 'bg-rose-400',   label: 'Error'      },
  }[fuente.estado];
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${cfg.c}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      <span>{fuente.nombre}</span>
      <span className="opacity-60">·</span>
      <span>{cfg.label}</span>
    </div>
  );
}
