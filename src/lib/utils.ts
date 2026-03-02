import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCLP(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)} MM`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)} M`;
  return `$${value.toLocaleString('es-CL')}`;
}

export function formatGWh(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)} TWh`;
  return `${value.toFixed(0)} GWh`;
}

export function formatMW(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(2)} GW`;
  return `${value.toFixed(0)} MW`;
}

export function formatPorcentaje(value: number): string {
  return `${value.toFixed(1)}%`;
}

export const COLORES_TECNOLOGIA: Record<string, string> = {
  solar: '#FBBF24',
  eolica: '#60A5FA',
  hidro: '#34D399',
  termicaGas: '#F97316',
  termicaCarbon: '#6B7280',
  termicaPetroleo: '#9CA3AF',
  geotermica: '#EC4899',
  biogas: '#A78BFA',
  otros: '#D1D5DB',
};

export const NOMBRES_TECNOLOGIA: Record<string, string> = {
  solar: 'Solar FV',
  eolica: 'Eólica',
  hidro: 'Hidráulica',
  termicaGas: 'Térmica Gas',
  termicaCarbon: 'Térmica Carbón',
  termicaPetroleo: 'Térmica Petróleo',
  geotermica: 'Geotérmica',
  biogas: 'Biogás',
  otros: 'Otros',
};

export const COLORES_SSCC = {
  regulacionFrecuencia: '#3B82F6',
  regulacionTension: '#10B981',
  arranqueSinRed: '#F59E0B',
  potenciaReactiva: '#8B5CF6',
  reservaGiro: '#EF4444',
  otros: '#6B7280',
};
