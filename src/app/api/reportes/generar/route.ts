import { NextRequest, NextResponse } from "next/server";
import { loadAggregatedData } from "@/lib/data-store";
import { filterRecords, parseFiltersFromSearchParams } from "@/lib/filter-utils";
import { generarReporte } from "@/lib/report-engine";
import type { ReporteDimension, ReporteGranularidad } from "@/lib/types";
import { buildDetalleSheet, buildResumenSheet, workbookToBuffer, xlsxFilename, XLSX_CONTENT_TYPE } from "@/lib/xlsx-export";

const DIMENSIONES: ReporteDimension[] = [
  "periodo",
  "profesional",
  "prestacion",
  "tipoAtencion",
  "estamento",
  "estado",
];
const GRANULARIDADES: ReporteGranularidad[] = ["dia", "semana", "mes"];

export async function GET(request: NextRequest) {
  let data;
  try {
    data = await loadAggregatedData();
  } catch (err) {
    console.error("[/api/reportes/generar]", err);
    return NextResponse.json({ error: "No se pudo leer el archivo de datos agregados." }, { status: 500 });
  }

  const sp = request.nextUrl.searchParams;
  const dimension = sp.get("dimension") as ReporteDimension;
  const granularidad = (sp.get("granularidad") ?? "mes") as ReporteGranularidad;
  const format = sp.get("format") ?? "json";

  if (!DIMENSIONES.includes(dimension)) {
    return NextResponse.json(
      { error: `Dimensión inválida. Debe ser una de: ${DIMENSIONES.join(", ")}.` },
      { status: 400 }
    );
  }
  if (!GRANULARIDADES.includes(granularidad)) {
    return NextResponse.json(
      { error: `Granularidad inválida. Debe ser una de: ${GRANULARIDADES.join(", ")}.` },
      { status: 400 }
    );
  }

  const filters = parseFiltersFromSearchParams(sp);
  const filtered = filterRecords(data, filters);
  const reporte = generarReporte(filtered, dimension, granularidad);

  if (format === "xlsx") {
    // Resumen = la agregación elegida; Detalle = todas las filas granulares
    // que la componen (mismo filtro, sin agrupar) — el mayor detalle posible
    // sin PII de pacientes.
    const buffer = workbookToBuffer([
      { name: "Resumen", ws: buildResumenSheet(reporte.filas) },
      { name: "Detalle", ws: buildDetalleSheet(filtered) },
    ]);
    return new NextResponse(buffer as BodyInit, {
      headers: {
        "Content-Type": XLSX_CONTENT_TYPE,
        "Content-Disposition": `attachment; filename="${xlsxFilename(`reporte-${dimension}`)}"`,
      },
    });
  }

  return NextResponse.json(reporte);
}
