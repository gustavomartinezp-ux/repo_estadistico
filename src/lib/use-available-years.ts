"use client";

import { useEffect, useState } from "react";
import type { ReporteGenerado } from "./types";

/**
 * Años que realmente tienen datos cargados (no hardcodeado): se derivan una
 * vez de /api/reportes/generar agrupado por mes, sin filtros de fecha. Así
 * el selector de año no queda obsoleto cuando se carga un informe de un año
 * nuevo — se actualiza solo.
 */
export function useAvailableYears(): number[] {
  const [years, setYears] = useState<number[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reportes/generar?dimension=periodo&granularidad=mes")
      .then((res) => res.json())
      .then((data: ReporteGenerado) => {
        if (cancelled) return;
        const yearSet = new Set<number>();
        for (const fila of data.filas ?? []) {
          const year = Number(fila.clave.slice(0, 4));
          if (Number.isFinite(year)) yearSet.add(year);
        }
        setYears(Array.from(yearSet).sort((a, b) => a - b));
      })
      .catch(() => {
        // silencioso: si falla, los selectores de año simplemente no muestran opciones
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return years;
}
