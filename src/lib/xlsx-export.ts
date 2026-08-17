import * as XLSX from "xlsx";
import type { InasistenciaFila, ReporteFila, StatRecord } from "./types";

/**
 * Hoja de "Detalle": el grano más fino que exponemos — una fila por
 * combinación día/establecimiento/estamento/profesional/prestación/tipo de
 * atención/estado/motivo, con la cantidad de atenciones. Nunca incluye datos
 * de pacientes (RUT, nombre, contacto, diagnóstico): esos nunca se leen del
 * Excel origen más allá del ETL server-side.
 */
export function buildDetalleSheet(data: StatRecord[]): XLSX.WorkSheet {
  const rows = data.map((r) => ({
    Fecha: r.fechaISO,
    Establecimiento: r.establecimiento,
    Estamento: r.estamento,
    Profesional: r.profesional,
    "Prestación / Actividad": r.prestacion,
    "Tipo de Atención": r.tipoAtencion,
    Estado: r.estado,
    "Motivo No Atendido": r.motivoNoAtendido ?? "",
    Cantidad: r.cantidad,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 12 }, // Fecha
    { wch: 24 }, // Establecimiento
    { wch: 18 }, // Estamento
    { wch: 30 }, // Profesional
    { wch: 34 }, // Prestación
    { wch: 24 }, // Tipo de Atención
    { wch: 14 }, // Estado
    { wch: 28 }, // Motivo No Atendido
    { wch: 10 }, // Cantidad
  ];
  ws["!autofilter"] = { ref: ws["!ref"] ?? "A1" };
  return ws;
}

/** Hoja de "Resumen": la agregación por la dimensión elegida en el generador de reportes. */
export function buildResumenSheet(filas: ReporteFila[]): XLSX.WorkSheet {
  const rows = filas.map((f) => ({
    Categoría: f.clave,
    Registros: f.registros,
    Atendidas: f.atendidas,
    "No Atendidas": f.noAtendidas,
    Canceladas: f.canceladas,
    Otros: f.otros,
    "% Atención": f.tasaAtencion / 100,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 36 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 10 }, { wch: 12 }];
  // Formato porcentaje real para la última columna (B2:B... quedaría mal, es la col G)
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const cell = ws[XLSX.utils.encode_cell({ r: row, c: 6 })];
    if (cell) cell.z = "0%";
  }
  ws["!autofilter"] = { ref: ws["!ref"] ?? "A1" };
  return ws;
}

/** Hoja de desglose de inasistencias (por profesional/período/día/prestación): cuenta + tasa NSP. */
export function buildInasistenciaSheet(filas: InasistenciaFila[], columnaClave: string): XLSX.WorkSheet {
  const rows = filas.map((f) => ({
    [columnaClave]: f.clave,
    "Total Citas": f.totalCitas,
    "No Se Presentó": f.nsp,
    "Tasa NSP": f.tasaNSP / 100,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 32 }, { wch: 12 }, { wch: 14 }, { wch: 10 }];
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let row = range.s.r + 1; row <= range.e.r; row++) {
    const cell = ws[XLSX.utils.encode_cell({ r: row, c: 3 })];
    if (cell) cell.z = "0.0%";
  }
  ws["!autofilter"] = { ref: ws["!ref"] ?? "A1" };
  return ws;
}

/** Hoja de resumen simple tipo clave-valor (para totales/metadatos). */
export function buildKeyValueSheet(pairs: Array<[] | [string, string | number]>): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(pairs);
  ws["!cols"] = [{ wch: 34 }, { wch: 22 }];
  return ws;
}

export function workbookToBuffer(sheets: Array<{ name: string; ws: XLSX.WorkSheet }>): Buffer {
  const wb = XLSX.utils.book_new();
  for (const { name, ws } of sheets) {
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

export function xlsxFilename(prefix: string): string {
  return `${prefix}-${new Date().toISOString().slice(0, 10)}.xlsx`;
}

export const XLSX_CONTENT_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
