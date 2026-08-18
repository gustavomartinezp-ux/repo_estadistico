import { getEstablecimientosDeRed, REDES } from "./establecimientos";
import { esProfesionalReal } from "./profesionales";
import type { AtencionesResponse, CategoryAggregate, DashboardFilters, StatRecord } from "./types";

/** Parsea los query params de un request (?red=&establecimiento=&...) a DashboardFilters. */
export function parseFiltersFromSearchParams(searchParams: URLSearchParams): DashboardFilters {
  return {
    ...EMPTY_FILTERS,
    red: searchParams.get("red"),
    establecimiento: searchParams.get("establecimiento"),
    estamento: searchParams.get("estamento"),
    profesional: searchParams.get("profesional"),
    prestacion: searchParams.get("prestacion"),
    estado: searchParams.get("estado"),
    dateRange: {
      from: searchParams.get("from"),
      to: searchParams.get("to"),
    },
  };
}

export const EMPTY_FILTERS: DashboardFilters = {
  red: null,
  establecimiento: null,
  estamento: null,
  profesional: null,
  prestacion: null,
  estado: null,
  dateRange: { from: null, to: null },
};

function unique(values: string[]): string[] {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, "es"));
}

/** Establecimientos disponibles para elegir, acotados por la red seleccionada (si hay). */
export function getEstablecimientoOptions(filters: DashboardFilters): string[] {
  if (filters.red) return getEstablecimientosDeRed(filters.red);
  return REDES.flatMap((r) => [r.cesfam, ...r.dependencias]);
}

/** Estamentos que realmente existen en los datos, dado el establecimiento ya elegido. */
export function getEstamentoOptions(data: StatRecord[], filters: DashboardFilters): string[] {
  const scoped = applyScopeFilters(data, filters, ["red", "establecimiento"]);
  return unique(scoped.map((r) => r.estamento));
}

/** Profesionales que existen en los datos, dado establecimiento + estamento ya elegidos. */
export function getProfesionalOptions(data: StatRecord[], filters: DashboardFilters): string[] {
  const scoped = applyScopeFilters(data, filters, ["red", "establecimiento", "estamento"]);
  return unique(scoped.map((r) => r.profesional).filter(esProfesionalReal));
}

/** Prestaciones/actividades disponibles, dado todo lo anterior ya elegido. */
export function getPrestacionOptions(data: StatRecord[], filters: DashboardFilters): string[] {
  const scoped = applyScopeFilters(data, filters, [
    "red",
    "establecimiento",
    "estamento",
    "profesional",
  ]);
  return unique(scoped.map((r) => r.prestacion));
}

/** Estados de cita disponibles, dado todo lo anterior ya elegido. */
export function getEstadoOptions(data: StatRecord[], filters: DashboardFilters): string[] {
  const scoped = applyScopeFilters(data, filters, [
    "red",
    "establecimiento",
    "estamento",
    "profesional",
    "prestacion",
  ]);
  return unique(scoped.map((r) => r.estado));
}

type ScopeKey = "red" | "establecimiento" | "estamento" | "profesional" | "prestacion" | "estado";

/**
 * Aplica solo un subconjunto de los filtros (usado para calcular las opciones
 * de un select en función de los filtros "anteriores" en la cadena, sin que el
 * propio valor de ese select se autolimite).
 */
function applyScopeFilters(
  data: StatRecord[],
  filters: DashboardFilters,
  keys: ScopeKey[]
): StatRecord[] {
  return data.filter((r) => {
    if (keys.includes("red") && filters.red) {
      const permitidos = getEstablecimientosDeRed(filters.red);
      if (!permitidos.includes(r.establecimiento)) return false;
    }
    if (keys.includes("establecimiento") && filters.establecimiento) {
      if (r.establecimiento !== filters.establecimiento) return false;
    }
    if (keys.includes("estamento") && filters.estamento) {
      if (r.estamento !== filters.estamento) return false;
    }
    if (keys.includes("profesional") && filters.profesional) {
      if (r.profesional !== filters.profesional) return false;
    }
    if (keys.includes("prestacion") && filters.prestacion) {
      if (r.prestacion !== filters.prestacion) return false;
    }
    if (keys.includes("estado") && filters.estado) {
      if (r.estado !== filters.estado) return false;
    }
    return true;
  });
}

/** Aplica TODOS los filtros (incluyendo rango de fechas) al set de datos. */
export function filterRecords(data: StatRecord[], filters: DashboardFilters): StatRecord[] {
  return data.filter((r) => {
    if (filters.red) {
      const permitidos = getEstablecimientosDeRed(filters.red);
      if (!permitidos.includes(r.establecimiento)) return false;
    }
    if (filters.establecimiento && r.establecimiento !== filters.establecimiento) return false;
    if (filters.estamento && r.estamento !== filters.estamento) return false;
    if (filters.profesional && r.profesional !== filters.profesional) return false;
    if (filters.prestacion && r.prestacion !== filters.prestacion) return false;
    if (filters.estado && r.estado !== filters.estado) return false;
    if (filters.dateRange.from && r.fechaISO < filters.dateRange.from) return false;
    if (filters.dateRange.to && r.fechaISO > filters.dateRange.to) return false;
    return true;
  });
}

/** Suma "cantidad" agrupando por el campo indicado, orden descendente. */
function aggregateBy(
  records: StatRecord[],
  key: "prestacion" | "profesional"
): CategoryAggregate[] {
  const totals = new Map<string, number>();
  for (const r of records) {
    const label = r[key];
    if (key === "profesional" && !esProfesionalReal(label)) continue;
    totals.set(label, (totals.get(label) ?? 0) + r.cantidad);
  }
  return Array.from(totals.entries())
    .map(([label, cantidad]) => ({ label, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

/**
 * Elige la dimensión del gráfico según el contexto: si ya se filtró a una
 * prestación específica, un solo bar "por prestación" no dice nada — en ese
 * caso se agrupa por profesional (quién la realizó). Si no, se agrupa por
 * prestación (panorama general de actividades).
 */
export function buildChart(
  records: StatRecord[],
  filters: DashboardFilters
): { groupBy: "prestacion" | "profesional"; data: CategoryAggregate[] } {
  if (filters.prestacion) {
    return { groupBy: "profesional", data: aggregateBy(records, "profesional") };
  }
  return { groupBy: "prestacion", data: aggregateBy(records, "prestacion") };
}

/** true si no hay ningún filtro aplicado (el caso "Todos" — la carga inicial del Dashboard). */
export function isEmptyFilters(filters: DashboardFilters): boolean {
  return (
    !filters.red &&
    !filters.establecimiento &&
    !filters.estamento &&
    !filters.profesional &&
    !filters.prestacion &&
    !filters.estado &&
    !filters.dateRange.from &&
    !filters.dateRange.to
  );
}

/**
 * Arma la respuesta completa de /api/atenciones para un set de filtros dado.
 * Se usa tanto para responder el request en vivo como para precalcular el
 * caso "sin filtros" cada vez que se carga un informe nuevo (ver
 * atenciones-summary.ts) — así la carga inicial del Dashboard no necesita
 * releer ni filtrar el agregado completo en cada visita.
 */
export function buildAtencionesResponse(data: StatRecord[], filters: DashboardFilters): AtencionesResponse {
  const filtered = filterRecords(data, filters);
  const totalRegistros = filtered.reduce((sum, r) => sum + r.cantidad, 0);
  const totalAtendidas = filtered
    .filter((r) => r.estado === "Atendido")
    .reduce((sum, r) => sum + r.cantidad, 0);

  return {
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
}
