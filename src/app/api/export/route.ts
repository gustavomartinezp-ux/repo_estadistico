import { NextRequest, NextResponse } from "next/server";
import { loadAggregatedData } from "@/lib/data-store";
import { filterRecords, parseFiltersFromSearchParams } from "@/lib/filter-utils";
import { buildDetalleSheet, workbookToBuffer, xlsxFilename, XLSX_CONTENT_TYPE } from "@/lib/xlsx-export";

export async function GET(request: NextRequest) {
  let data;
  try {
    data = await loadAggregatedData();
  } catch (err) {
    console.error("[/api/export]", err);
    return NextResponse.json({ error: "No se pudo leer el archivo de datos agregados." }, { status: 500 });
  }

  const filters = parseFiltersFromSearchParams(request.nextUrl.searchParams);
  const filtered = filterRecords(data, filters);

  const buffer = workbookToBuffer([{ name: "Detalle", ws: buildDetalleSheet(filtered) }]);

  return new NextResponse(buffer as BodyInit, {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="${xlsxFilename("produccion-aps")}"`,
    },
  });
}
