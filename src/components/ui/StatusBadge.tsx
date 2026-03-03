'use client';
import type { EstadoFuente } from '@/lib/types';

export default function StatusBadge({ fuente }: { fuente: EstadoFuente }) {
  const cfg = {
    ok:       { c: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Activo'     },
    fallback: { c: 'bg-amber-50  text-amber-700  border-amber-200',  dot: 'bg-amber-500',  label: 'Referencia' },
    error:    { c: 'bg-rose-50   text-rose-700   border-rose-200',   dot: 'bg-rose-500',   label: 'Error'      },
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
