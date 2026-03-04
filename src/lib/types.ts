// ============================================================
// TIPOS DEL SISTEMA ELÉCTRICO NACIONAL CHILENO - CEN Dashboard
// Fuentes: CNE Energía Abierta · CEN Gráficos SEN · Plabacom
// ============================================================

// ── PMGD ──────────────────────────────────────────────────────
export interface PMGDCapacidad {
  totalMW: number;
  porTecnologia: {
    solar: number;
    eolica: number;
    hidro: number;
    termoelectrica: number;
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

// ── CAPACIDAD INSTALADA SEN ────────────────────────────────────
export interface CapacidadTecnologia {
  mes: string;
  anio: number;
  totalMW: number;
  porTecnologia: {
    solar: number;
    eolica: number;
    hidroEmbalse: number;
    hidroPasada: number;
    miniHidro: number;
    termicaGas: number;
    termicaCarbon: number;
    termicaDiesel: number;
    geotermica: number;
    biomasa: number;
    bess: number;
    otros: number;
  };
  fuente: string;
}

export interface CapacidadRegion {
  region: string;
  codigo: string;
  totalMW: number;
  solar: number;
  eolica: number;
  hidro: number;
  termica: number;
  bess: number;
  otros: number;
}

// ── ALMACENAMIENTO BESS/SAEI ───────────────────────────────────
export interface AlmacenamientoRegion {
  region: string;
  codigo: string;
  potenciaMW: number;
  capacidadMWh: number;
  proyectos: number;
  tecnologia: string;
}

export interface AlmacenamientoEvolucion {
  mes: string;
  anio: number;
  totalMW: number;
  totalMWh: number;
  proyectosOperativos: number;
  fuente: string;
}

// ── GENERACIÓN SEN ─────────────────────────────────────────────
export interface GeneracionTecnologia {
  mes: string;
  anio: number;
  totalGWh: number;
  porTecnologia: {
    solar: number;
    eolica: number;
    hidroEmbalse: number;
    hidroPasada: number;
    miniHidro: number;
    termicaGas: number;
    termicaCarbon: number;
    termicaDiesel: number;
    geotermica: number;
    biomasa: number;
    bess: number;
    otros: number;
  };
  participacionERNC: number;
  vertimiento: number;
  fuente: string;
}

// ── DEMANDA ────────────────────────────────────────────────────
export interface DemandaMensual {
  mes: string;
  anio: number;
  totalGWh: number;
  demandaMaximaMW: number;
  factorCarga: number;
  porSector: {
    minero: number;
    industrial: number;
    residencial: number;
    comercial: number;
    otros: number;
  };
  fuente: string;
}

// ── PAGOS CLIENTES ─────────────────────────────────────────────
export interface PagosClientesMes {
  mes: string;
  anio: number;
  totalFacturadoCLP: number;
  porTipoCliente: {
    reguladoBT: number;
    reguladoAT: number;
    libreGrande: number;
    libreMediano: number;
  };
  distribucionCargos: {
    energia: number;
    potencia: number;
    transmision: number;
    distribucion: number;
    cargosAdicionales: number;
  };
  preciosPromedio: {
    residencial_CLPkWh: number;
    industrial_CLPkWh: number;
    minero_CLPkWh: number;
    precioNudoCortoPlazo_USDMWh: number;
  };
  fuente: string;
}

// ── TRANSFERENCIAS ECONÓMICAS (PLABACOM) ──────────────────────
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
    termicaDiesel: number;
    geotermica: number;
    bess: number;
    otros: number;
  };
  fuente: string;
}

export interface TransferenciasEconomicas {
  mes: string;
  anio: number;
  compensacionPrecioEstabilizadoCLP: number;
  compensacionDecreto244CLP: number;
  compensacionDecreto88CLP: number;
  compensacionCostoMarginalCLP: number;
  pagosLateralesCLP: number;
  ssccTotalCLP: number;
  potenciaTotalCLP: number;
  potenciaPorTecnologia: {
    solar: number;
    eolica: number;
    hidro: number;
    termicaGas: number;
    termicaCarbon: number;
    termicaDiesel: number;
    geotermica: number;
    bess: number;
    otros: number;
  };
  totalTransferenciasCLP: number;
  fuente: string;
}

// ── DASHBOARD PRINCIPAL ────────────────────────────────────────
export interface DashboardData {
  pmgdCapacidad: PMGDCapacidad;
  pmgdCompensaciones: PMGDCompensacionMensual[];
  pmgdEstabilizacion: PMGDEstabilizacion[];
  capacidadTecnologia: CapacidadTecnologia;
  capacidadRegion: CapacidadRegion[];
  almacenamientoRegion: AlmacenamientoRegion[];
  almacenamientoEvolucion: AlmacenamientoEvolucion[];
  generacion: GeneracionTecnologia[];
  demanda: DemandaMensual[];
  pagosClientes: PagosClientesMes[];
  ssccPagos: SSCCPago[];
  ssccUnidades: SSCCUnidad[];
  potencia: PotenciaTecnologia[];
  transferenciasEconomicas: TransferenciasEconomicas[];
  ultimaActualizacion: string;
  estadoFuentes: EstadoFuente[];
}

export interface EstadoFuente {
  nombre: string;
  url: string;
  estado: 'ok' | 'error' | 'fallback';
  mensaje?: string;
}
