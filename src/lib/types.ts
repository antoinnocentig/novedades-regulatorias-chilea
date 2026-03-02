// ============================================================
// TIPOS DEL SISTEMA ELÉCTRICO NACIONAL CHILENO - CEN Dashboard
// ============================================================

export interface PMGDCapacidad {
  totalMW: number;
  porTecnologia: {
    solar: number;
    eolica: number;
    hidro: number;
    biogas: number;
    otros: number;
  };
  cantidadProyectos: number;
  fechaDato: string;
  fuente: string;
}

export interface PMGDCompensacionMensual {
  mes: string;
  anio: number;
  costoSistemicoCLP: number;
  costoSistemicoUSD: number;
  energiaKWh: number;
  precioPromedioMWh: number;
  fuente: string;
}

export interface PMGDEstabilizacion {
  mes: string;
  anio: number;
  decreto244: { montoCLP: number; porcentaje: number; energiaKWh: number };
  decreto88: { montoCLP: number; porcentaje: number; energiaKWh: number };
  costoMarginal: { montoCLP: number; porcentaje: number; energiaKWh: number };
  totalCLP: number;
  fuente: string;
}

export interface SSCCPago {
  mes: string;
  anio: number;
  totalCLP: number;
  porTipo: {
    regulacionFrecuencia: number;
    regulacionTension: number;
    arranqueSinRed: number;
    potenciaReactiva: number;
    reservaGiro: number;
    otros: number;
  };
  fuente: string;
}

export interface SSCCUnidad {
  nombre: string;
  tipo: string;
  tecnologia: string;
  serviciosPrestados: string[];
  potenciaMW: number;
  mesReporte: string;
  anioReporte: number;
}

export interface GeneracionTecnologia {
  mes: string;
  anio: number;
  totalGWh: number;
  porTecnologia: {
    solar: number;
    eolica: number;
    hidro: number;
    termicaGas: number;
    termicaCarbon: number;
    termicaPetroleo: number;
    geotermica: number;
    biogas: number;
    otros: number;
  };
  fuente: string;
}

export interface PotenciaTecnologia {
  mes: string;
  anio: number;
  totalCLP: number;
  porTecnologia: {
    solar: number;
    eolica: number;
    hidro: number;
    termicaGas: number;
    termicaCarbon: number;
    termicaPetroleo: number;
    geotermica: number;
    otros: number;
  };
  fuente: string;
}

export interface DashboardData {
  pmgdCapacidad: PMGDCapacidad;
  pmgdCompensaciones: PMGDCompensacionMensual[];
  pmgdEstabilizacion: PMGDEstabilizacion[];
  ssccPagos: SSCCPago[];
  ssccUnidades: SSCCUnidad[];
  generacion: GeneracionTecnologia[];
  potencia: PotenciaTecnologia[];
  ultimaActualizacion: string;
  estadoFuentes: EstadoFuente[];
}

export interface EstadoFuente {
  nombre: string;
  url: string;
  estado: 'ok' | 'error' | 'fallback';
  mensaje?: string;
}
