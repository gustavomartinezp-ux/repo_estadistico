import { NextRequest, NextResponse } from "next/server";
import { loadAggregatedData } from "@/lib/data-store";
import { filterRecords, parseFiltersFromSearchParams } from "@/lib/filter-utils";
import { buildDetalleSheet, workbookToBuffer, xlsxFilename, XLSX_CONTENT_TYPE } from "@/lib/xlsx-export";

// El agregado se lee de Vercel Blob (crece con cada carga; ya supera
// 190MB) y se parsea en memoria - 60s es el máximo configurable en el
// plan Hobby de Vercel, por si el default de 10s no alcanza.
export const maxDuration = 60;

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
