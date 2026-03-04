import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCLP(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)} MM`;
  if (value >= 1_000_000)     return `$${(value / 1_000_000).toFixed(0)} M`;
  return `$${value.toLocaleString('es-CL')}`;
}

export function formatGWh(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(2)} TWh`;
  return `${value.toFixed(0)} GWh`;
}

export function formatMW(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(2)} GW`;
  return `${value.toFixed(0)} MW`;
}

export function formatMWh(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)} GWh`;
  return `${value.toFixed(0)} MWh`;
}

export function formatPorcentaje(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatCLPkWh(value: number): string {
  return `${value.toFixed(0)} CLP/kWh`;
}

export function formatUSDMWh(value: number): string {
  return `${value.toFixed(0)} USD/MWh`;
}

// Colores por tecnología (generación y capacidad)
export const COLORES_TECNOLOGIA: Record<string, string> = {
  solar:           '#F59E0B',
  eolica:          '#22C55E',
  hidroEmbalse:    '#3B82F6',
  hidroPasada:     '#60A5FA',
  miniHidro:       '#93C5FD',
  hidro:           '#3B82F6', // alias
  termicaGas:      '#92400E',
  termicaCarbon:   '#1C1917',
  termicaDiesel:   '#78716C',
  termoelectrica:  '#9CA3AF', // PMGD alias
  geotermica:      '#EC4899',
  biomasa:         '#84CC16',
  biogas:          '#A78BFA',
  bess:            '#06B6D4',
  otros:           '#CBD5E1',
};

export const NOMBRES_TECNOLOGIA: Record<string, string> = {
  solar:           'Solar FV',
  eolica:          'Eólica',
  hidroEmbalse:    'Hidro Embalse',
  hidroPasada:     'Hidro Pasada',
  miniHidro:       'Mini-Hidro',
  hidro:           'Hidráulica',
  termicaGas:      'Térmica Gas',
  termicaCarbon:   'Térmica Carbón',
  termicaDiesel:   'Térmica Diésel',
  termoelectrica:  'Termoeléctrica',
  geotermica:      'Geotérmica',
  biomasa:         'Biomasa',
  biogas:          'Biogás',
  bess:            'Almacenamiento (BESS)',
  otros:           'Otros',
};

export const COLORES_SSCC = {
  regulacionFrecuencia: '#3B82F6',
  regulacionTension:    '#10B981',
  arranqueSinRed:       '#F59E0B',
  potenciaReactiva:     '#8B5CF6',
  reservaGiro:          '#EF4444',
  otros:                '#6B7280',
};

export const COLORES_SECTOR = {
  minero:      '#F59E0B',
  industrial:  '#6366F1',
  residencial: '#10B981',
  comercial:   '#3B82F6',
  otros:       '#9CA3AF',
};

export const COLORES_CLIENTE = {
  reguladoBT:   '#3B82F6',
  reguladoAT:   '#22C55E',
  libreGrande:  '#F59E0B',
  libreMediano: '#8B5CF6',
};

export const COLORES_CARGO = {
  energia:           '#F59E0B',
  potencia:          '#3B82F6',
  transmision:       '#10B981',
  distribucion:      '#6366F1',
  cargosAdicionales: '#9CA3AF',
};
