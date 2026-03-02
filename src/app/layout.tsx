import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Dashboard SEN Chile — Coordinador Eléctrico Nacional',
  description: 'Dashboard ejecutivo del Sistema Eléctrico Nacional chileno. PMGD, Servicios Complementarios, Generación y Potencia. Fuente: CEN.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CL">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}
