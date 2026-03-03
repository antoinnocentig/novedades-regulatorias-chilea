'use client';

interface SectionCardProps {
  titulo: string;
  subtitulo?: string;
  fuente?: string;
  children: React.ReactNode;
  accion?: React.ReactNode;
  className?: string;
}

export default function SectionCard({ titulo, subtitulo, fuente, children, accion, className = '' }: SectionCardProps) {
  return (
    <div className={`rounded-xl border border-gray-200 bg-white overflow-hidden shadow-sm ${className}`}>
      <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{titulo}</h3>
          {subtitulo && <p className="text-xs text-gray-500 mt-0.5">{subtitulo}</p>}
        </div>
        {accion && <div>{accion}</div>}
      </div>
      <div className="p-6">{children}</div>
      {fuente && (
        <div className="px-6 pb-3 pt-0 text-[10px] text-gray-400 border-t border-gray-50">
          Fuente: {fuente}
        </div>
      )}
    </div>
  );
}
