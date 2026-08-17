import { esProfesionalReal } from "./profesionales";
import type {
  InasistenciaFila,
  ReporteDimension,
  ReporteFila,
  ReporteGenerado,
  ReporteGranularidad,
  ReporteInasistencias,
  StatRecord,
} from "./types";

/** Lunes de la semana ISO que contiene fechaISO, como "YYYY-MM-DD". */
function inicioDeSemana(fechaISO: string): string {
  const d = new Date(`${fechaISO}T00:00:00`);
  const diaISO = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - diaISO);
  return d.toISOString().slice(0, 10);
}

function bucketPeriodo(fechaISO: string, granularidad: ReporteGranularidad): string {
  if (granularidad === "dia") return fechaISO;
  if (granularidad === "mes") return fechaISO.slice(0, 7);
  return inicioDeSemana(fechaISO);
}

/** Para "estado", el No Atendido se desglosa por motivo (NSP, licencia médica, etc). */
function claveEstado(r: StatRecord): string {
  if (r.estado === "No Atendido") {
    return `No Atendido — ${r.motivoNoAtendido ?? "Sin motivo registrado"}`;
  }
  return r.estado;
}

function claveDe(r: StatRecord, dimension: ReporteDimension, granularidad: ReporteGranularidad): string {
  switch (dimension) {
    case "periodo":
      return bucketPeriodo(r.fechaISO, granularidad);
    case "profesional":
      return r.profesional;
    case "prestacion":
      return r.prestacion;
    case "tipoAtencion":
      return r.tipoAtencion;
    case "estamento":
      return r.estamento;
    case "estado":
      return claveEstado(r);
  }
}

interface Acc {
  registros: number;
  atendidas: number;
  noAtendidas: number;
  canceladas: number;
  otros: number;
}

function emptyAcc(): Acc {
  return { registros: 0, atendidas: 0, noAtendidas: 0, canceladas: 0, otros: 0 };
}

function sumaEn(acc: Acc, r: StatRecord) {
  acc.registros += r.cantidad;
  if (r.estado === "Atendido") acc.atendidas += r.cantidad;
  else if (r.estado === "No Atendido") acc.noAtendidas += r.cantidad;
  else if (r.estado === "Cancelado") acc.canceladas += r.cantidad;
  else acc.otros += r.cantidad;
}

export function generarReporte(
  records: StatRecord[],
  dimension: ReporteDimension,
  granularidad: ReporteGranularidad
): ReporteGenerado {
  const map = new Map<string, Acc>();
  const totales = emptyAcc();

  for (const r of records) {
    sumaEn(totales, r);
    // "profesional" excluye etiquetas de servicio (ej. "FARMACIA CPA") de las
    // filas — la cita sigue sumando al total de arriba, solo no aparece
    // listada como si fuera una persona.
    if (dimension === "profesional" && !esProfesionalReal(r.profesional)) continue;

    const clave = claveDe(r, dimension, granularidad);
    let acc = map.get(clave);
    if (!acc) {
      acc = emptyAcc();
      map.set(clave, acc);
    }
    sumaEn(acc, r);
  }

  const filas: ReporteFila[] = Array.from(map.entries()).map(([clave, acc]) => ({
    clave,
    ...acc,
    tasaAtencion: acc.registros ? Math.round((acc.atendidas / acc.registros) * 100) : 0,
  }));

  filas.sort(
    dimension === "periodo"
      ? (a, b) => a.clave.localeCompare(b.clave)
      : (a, b) => b.registros - a.registros
  );

  return { dimension, granularidad, filas, totales };
}

/**
 * Reporte exclusivo de inasistencias: citas No Atendidas por el motivo
 * "Paciente No se Presentó" (NSP). A diferencia de generarReporte(), cada
 * fila lleva la TASA de inasistencia (nsp / total de citas del grupo), no
 * solo el conteo — un profesional con 50 NSP de 60 citas es un problema
 * distinto a uno con 50 NSP de 2.000 citas.
 */
export const MOTIVO_NSP = "Paciente No se Presentó";

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

function diaSemanaDe(fechaISO: string): string {
  const d = new Date(`${fechaISO}T00:00:00`);
  const idx = (d.getDay() + 6) % 7; // getDay(): 0=domingo..6=sábado -> 0=lunes..6=domingo
  return DIAS_SEMANA[idx];
}

function esNSP(r: StatRecord): boolean {
  return r.estado === "No Atendido" && r.motivoNoAtendido === MOTIVO_NSP;
}

function aggregatePorClave(
  records: StatRecord[],
  claveDe: (r: StatRecord) => string
): Map<string, { totalCitas: number; nsp: number }> {
  const map = new Map<string, { totalCitas: number; nsp: number }>();
  for (const r of records) {
    const clave = claveDe(r);
    let acc = map.get(clave);
    if (!acc) {
      acc = { totalCitas: 0, nsp: 0 };
      map.set(clave, acc);
    }
    acc.totalCitas += r.cantidad;
    if (esNSP(r)) acc.nsp += r.cantidad;
  }
  return map;
}

function toFilas(
  map: Map<string, { totalCitas: number; nsp: number }>,
  orden?: (a: InasistenciaFila, b: InasistenciaFila) => number
): InasistenciaFila[] {
  const filas = Array.from(map.entries()).map(([clave, { totalCitas, nsp }]) => ({
    clave,
    totalCitas,
    nsp,
    tasaNSP: totalCitas ? Math.round((nsp / totalCitas) * 1000) / 10 : 0,
  }));
  filas.sort(orden ?? ((a, b) => b.nsp - a.nsp));
  return filas;
}

export function generarReporteInasistencias(records: StatRecord[]): ReporteInasistencias {
  let totalRegistros = 0;
  let totalNoAtendido = 0;
  let totalNSP = 0;
  for (const r of records) {
    totalRegistros += r.cantidad;
    if (r.estado === "No Atendido") totalNoAtendido += r.cantidad;
    if (esNSP(r)) totalNSP += r.cantidad;
  }

  const porProfesional = toFilas(
    aggregatePorClave(
      records.filter((r) => esProfesionalReal(r.profesional)),
      (r) => r.profesional
    )
  );
  const porPrestacion = toFilas(aggregatePorClave(records, (r) => r.prestacion));
  const porTipoAtencion = toFilas(aggregatePorClave(records, (r) => r.tipoAtencion));
  const porEstamento = toFilas(aggregatePorClave(records, (r) => r.estamento));
  const porPeriodo = toFilas(
    aggregatePorClave(records, (r) => bucketPeriodo(r.fechaISO, "mes")),
    (a, b) => a.clave.localeCompare(b.clave)
  );
  const porDiaSemana = toFilas(
    aggregatePorClave(records, (r) => diaSemanaDe(r.fechaISO)),
    (a, b) => DIAS_SEMANA.indexOf(a.clave) - DIAS_SEMANA.indexOf(b.clave)
  );

  return {
    totales: {
      totalRegistros,
      totalNoAtendido,
      totalNSP,
      tasaNSPsobreTotal: totalRegistros ? Math.round((totalNSP / totalRegistros) * 1000) / 10 : 0,
      tasaNSPsobreNoAtendido: totalNoAtendido ? Math.round((totalNSP / totalNoAtendido) * 1000) / 10 : 0,
    },
    porProfesional,
    porPrestacion,
    porTipoAtencion,
    porEstamento,
    porPeriodo,
    porDiaSemana,
  };
}
