import { NextRequest, NextResponse } from "next/server";
import { loadAggregatedData } from "@/lib/data-store";
import { filterRecords, parseFiltersFromSearchParams } from "@/lib/filter-utils";
import { generarReporteInasistencias, MOTIVO_NSP } from "@/lib/report-engine";
import {
  buildDetalleSheet,
  buildInasistenciaSheet,
  buildKeyValueSheet,
  workbookToBuffer,
  xlsxFilename,
  XLSX_CONTENT_TYPE,
} from "@/lib/xlsx-export";

export async function GET(request: NextRequest) {
  let data;
  try {
    data = await loadAggregatedData();
  } catch (err) {
    console.error("[/api/reportes/inasistencias]", err);
    return NextResponse.json({ error: "No se pudo leer el archivo de datos agregados." }, { status: 500 });
  }

  const sp = request.nextUrl.searchParams;
  const filters = parseFiltersFromSearchParams(sp);
  const filtered = filterRecords(data, filters);
  const reporte = generarReporteInasistencias(filtered);

  if (sp.get("format") === "xlsx") {
    const t = reporte.totales;
    const resumen = buildKeyValueSheet([
      ["Reporte", "Inasistencias — Paciente No Se Presentó (NSP)"],
      ["Generado", new Date().toLocaleString("es-CL")],
      [],
      ["Total de citas (todas)", t.totalRegistros],
      ["Total No Atendido (todos los motivos)", t.totalNoAtendido],
      ["Total No Se Presentó (NSP)", t.totalNSP],
      ["Tasa NSP sobre el total de citas", `${t.tasaNSPsobreTotal}%`],
      ["Tasa NSP sobre el total de No Atendido", `${t.tasaNSPsobreNoAtendido}%`],
    ]);

    const detalleNSP = filtered.filter(
      (r) => r.estado === "No Atendido" && r.motivoNoAtendido === MOTIVO_NSP
    );

    const buffer = workbookToBuffer([
      { name: "Resumen", ws: resumen },
      { name: "Por Profesional", ws: buildInasistenciaSheet(reporte.porProfesional, "Profesional") },
      { name: "Por Período", ws: buildInasistenciaSheet(reporte.porPeriodo, "Mes") },
      { name: "Por Día de Semana", ws: buildInasistenciaSheet(reporte.porDiaSemana, "Día") },
      { name: "Por Prestación", ws: buildInasistenciaSheet(reporte.porPrestacion, "Prestación") },
      { name: "Por Tipo de Atención", ws: buildInasistenciaSheet(reporte.porTipoAtencion, "Tipo de Atención") },
      { name: "Por Estamento", ws: buildInasistenciaSheet(reporte.porEstamento, "Estamento") },
      { name: "Detalle NSP", ws: buildDetalleSheet(detalleNSP) },
    ]);

    return new NextResponse(buffer as BodyInit, {
      headers: {
        "Content-Type": XLSX_CONTENT_TYPE,
        "Content-Disposition": `attachment; filename="${xlsxFilename("reporte-inasistencias-nsp")}"`,
      },
    });
  }

  return NextResponse.json(reporte);
}
