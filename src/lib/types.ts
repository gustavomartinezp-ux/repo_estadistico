/** Forma cruda de un registro tal como llega del informe estadístico (Excel/CSV). */
export interface RawStatRecord {
  Fecha: string; // "DD-MM-YYYY"
  Establecimiento: string;
  Estamento: string;
  Profesional: string;
  "Tipo de prestación agendada": string;
  Cantidad: number;
}

/** Forma normalizada que consume la UI (camelCase, fecha parseada). */
export interface StatRecord {
  fecha: Date;
  fechaISO: string; // "YYYY-MM-DD", útil para comparar/ordenar
  establecimiento: string;
  estamento: string;
  profesional: string;
  prestacion: string;
  estado: string;
  tipoAtencion: string; // TipoAtencion: "C. Nueva", "C. Repetida (Ctrl)", "C. Abreviada (Rec)", "Procedimiento", ...
  motivoNoAtendido: string | null; // solo cuando estado === "No Atendido" (ej. "Paciente No se Presentó")
  cantidad: number;
}

/** Registro agregado tal como lo produce el ETL (data/atenciones.json). Sin PII. */
export interface AggregatedRecord {
  fecha: string; // "YYYY-MM-DD"
  establecimiento: string;
  estamento: string;
  profesional: string;
  prestacion: string;
  estado: string;
  tipoAtencion: string;
  motivoNoAtendido: string | null;
  cantidad: number;
}

/** Red de un CESFAM y sus dependencias (CECOSF / Postas). */
export interface RedEstablecimientos {
  cesfam: string;
  dependencias: string[];
}

export interface DateRange {
  from: string | null; // "YYYY-MM-DD"
  to: string | null;
}

export interface DashboardFilters {
  red: string | null; // nombre del CESFAM cabecera, o null = todas las redes
  establecimiento: string | null; // CESFAM o dependencia puntual, o null = todos dentro de la red
  estamento: string | null;
  profesional: string | null;
  prestacion: string | null; // tipo de prestación / actividad agendada
  estado: string | null; // EstadoCita: Atendido, Cancelado, No Atendido, ...
  dateRange: DateRange;
}

/** Respuesta del API route /api/atenciones. */
export interface AtencionesResponse {
  kpis: {
    totalRegistros: number;
    totalAtendidas: number;
    profesionalesActivos: number;
    prestacionesDistintas: number;
  };
  /**
   * Sin filtro de prestación: cantidad por tipo de prestación (panorama general).
   * Con una prestación elegida: cantidad por profesional que la realizó
   * (un solo bar "por prestación" no aporta nada una vez que ya filtraste a una).
   */
  chart: {
    groupBy: "prestacion" | "profesional";
    data: CategoryAggregate[];
  };
  options: {
    estamentos: string[];
    profesionales: string[];
    prestaciones: string[];
    estados: string[];
  };
}

export interface CategoryAggregate {
  label: string;
  cantidad: number;
}

/** Resultado de procesar un informe Excel crudo (ver src/lib/etl.ts). */
export interface EtlReport {
  generadoEn: string;
  archivoFuente: string;
  establecimientosDetectados: string[];
  filasLeidas: number;
  filasReparadas: number;
  filasDescartadasPorCorrupcion: number;
  filasDescartadasPorCamposFaltantes: number;
  filasValidasAgregadas: number;
  gruposAgregados: number;
  rangoFechas: { desde: string | null; hasta: string | null };
  etiquetasCorruptasDetectadas: Record<string, number>;
}

export interface EstablecimientoSummary {
  nombre: string;
  red: string;
  esCabecera: boolean;
  totalRegistros: number;
  totalAtendidas: number;
  profesionalesActivos: number;
  prestacionesDistintas: number;
  rangoFechas: { desde: string | null; hasta: string | null };
}

export interface ProfesionalSummary {
  nombre: string;
  estamento: string;
  establecimientos: string[];
  totalRegistros: number;
  totalAtendidas: number;
  prestacionesDistintas: number;
}

export interface PrestacionSummary {
  nombre: string;
  estamentos: string[];
  totalRegistros: number;
  totalAtendidas: number;
  profesionalesDistintos: number;
}

export type ReporteDimension =
  | "periodo"
  | "profesional"
  | "prestacion"
  | "tipoAtencion"
  | "estamento"
  | "estado";

export type ReporteGranularidad = "dia" | "semana" | "mes";

export interface ReporteFila {
  clave: string;
  registros: number;
  atendidas: number;
  noAtendidas: number;
  canceladas: number;
  otros: number;
  tasaAtencion: number;
}

export interface ReporteGenerado {
  dimension: ReporteDimension;
  granularidad: ReporteGranularidad;
  filas: ReporteFila[];
  totales: {
    registros: number;
    atendidas: number;
    noAtendidas: number;
    canceladas: number;
    otros: number;
  };
}

/** Fila del reporte de inasistencias: cuenta Y tasa, no solo cuenta. */
export interface InasistenciaFila {
  clave: string;
  totalCitas: number;
  nsp: number;
  tasaNSP: number; // % (0-100, con 1 decimal)
}

export interface ReporteInasistencias {
  totales: {
    totalRegistros: number;
    totalNoAtendido: number;
    totalNSP: number;
    tasaNSPsobreTotal: number;
    tasaNSPsobreNoAtendido: number;
  };
  porProfesional: InasistenciaFila[];
  porPrestacion: InasistenciaFila[];
  porTipoAtencion: InasistenciaFila[];
  porEstamento: InasistenciaFila[];
  porPeriodo: InasistenciaFila[];
  porDiaSemana: InasistenciaFila[];
}
