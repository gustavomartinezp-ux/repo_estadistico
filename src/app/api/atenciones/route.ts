import { NextRequest, NextResponse } from "next/server";
import {
  buildChart,
  filterRecords,
  getEstadoOptions,
  getEstamentoOptions,
  getPrestacionOptions,
  getProfesionalOptions,
  parseFiltersFromSearchParams,
} from "@/lib/filter-utils";
import { loadAggregatedData } from "@/lib/data-store";
import { esProfesionalReal } from "@/lib/profesionales";
import type { AtencionesResponse, StatRecord } from "@/lib/types";

// El agregado se lee de Vercel Blob (crece con cada carga; ya supera
// 190MB) y se parsea en memoria - 60s es el máximo configurable en el
// plan Hobby de Vercel, por si el default de 10s no alcanza.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  let data: StatRecord[];
  try {
    data = await loadAggregatedData();
  } catch (err) {
    console.error("[/api/atenciones] no se pudo cargar data/atenciones.json:", err);
    return NextResponse.json(
      { error: "No se pudo leer el archivo de datos agregados. Verifica que exista data/atenciones.json (correr `npm run etl`)." },
      { status: 500 }
    );
  }

  try {
    const filters = parseFiltersFromSearchParams(request.nextUrl.searchParams);
    const filtered = filterRecords(data, filters);

    const totalRegistros = filtered.reduce((sum, r) => sum + r.cantidad, 0);
    const totalAtendidas = filtered
      .filter((r) => r.estado === "Atendido")
      .reduce((sum, r) => sum + r.cantidad, 0);

    const response: AtencionesResponse = {
      kpis: {
        totalRegistros,
        totalAtendidas,
        profesionalesActivos: new Set(filtered.map((r) => r.profesional).filter(esProfesionalReal)).size,
        prestacionesDistintas: new Set(filtered.map((r) => r.prestacion)).size,
      },
      chart: buildChart(filtered, filters),
      options: {
        estamentos: getEstamentoOptions(data, filters),
        profesionales: getProfesionalOptions(data, filters),
        prestaciones: getPrestacionOptions(data, filters),
        estados: getEstadoOptions(data, filters),
      },
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("[/api/atenciones] error procesando filtros:", err);
    return NextResponse.json(
      { error: "Ocurrió un error al procesar la consulta." },
      { status: 500 }
    );
  }
}
