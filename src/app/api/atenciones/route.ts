import { NextRequest, NextResponse } from "next/server";
import { readAtencionesSummary } from "@/lib/atenciones-summary";
import { buildAtencionesResponse, isEmptyFilters, parseFiltersFromSearchParams } from "@/lib/filter-utils";
import { loadAggregatedData } from "@/lib/data-store";

// El agregado se lee de Vercel Blob (crece con cada carga; ya supera
// 190MB) y se parsea en memoria - 60s es el máximo configurable en el
// plan Hobby de Vercel, por si el default de 10s no alcanza.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const filters = parseFiltersFromSearchParams(request.nextUrl.searchParams);

  // La carga inicial del Dashboard (sin filtros) es, con diferencia, el caso
  // más común — se sirve directo del resumen precalculado en cada carga de
  // informe (ver data-store.ts) en vez de releer y filtrar el agregado
  // completo (cientos de miles de registros) en cada visita.
  if (isEmptyFilters(filters)) {
    const cached = await readAtencionesSummary().catch(() => null);
    if (cached) return NextResponse.json(cached);
  }

  try {
    const data = await loadAggregatedData();
    return NextResponse.json(buildAtencionesResponse(data, filters));
  } catch (err) {
    console.error("[/api/atenciones] error:", err);
    return NextResponse.json(
      { error: "No se pudo leer el archivo de datos agregados. Verifica que exista data/atenciones.json (correr `npm run etl`)." },
      { status: 500 }
    );
  }
}
