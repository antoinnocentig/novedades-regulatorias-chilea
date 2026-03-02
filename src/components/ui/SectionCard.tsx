'use client';

interface SectionCardProps {
  titulo: string;
  subtitulo?: string;
  children: React.ReactNode;
  accion?: React.ReactNode;
  className?: string;
}

export default function SectionCard({ titulo, subtitulo, children, accion, className = '' }: SectionCardProps) {
  return (
    <div className={`rounded-xl border border-slate-700/50 bg-slate-800/60 backdrop-blur-sm overflow-hidden ${className}`}>
      <div className="flex items-start justify-between px-6 py-4 border-b border-slate-700/50">
        <div>
          <h3 className="text-sm font-semibold text-slate-200">{titulo}</h3>
          {subtitulo && <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>}
        </div>
        {accion && <div>{accion}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
