"use client";

import { Download, SlidersHorizontal } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { REDES } from "@/lib/establecimientos";
import { getEstablecimientoOptions } from "@/lib/filter-utils";
import type { AtencionesResponse, DashboardFilters } from "@/lib/types";

interface FilterBarProps {
  filters: DashboardFilters;
  onChange: (filters: DashboardFilters) => void;
  options: AtencionesResponse["options"] | null;
  loading?: boolean;
  /** URL de /api/export con los filtros actuales ya codificados. */
  exportHref?: string;
}

/**
 * Barra de filtros en cadena: Red -> Establecimiento -> Estamento -> Profesional
 * -> Prestación/Actividad -> Estado. Las opciones de Estamento/Profesional/
 * Prestación/Estado las calcula el servidor (/api/atenciones) en función de
 * los filtros ya elegidos; Establecimiento sale de la jerarquía de red fija.
 * Cambiar un filtro "superior" limpia los que dependen de él.
 */
export function FilterBar({ filters, onChange, options, loading, exportHref }: FilterBarProps) {
  const establecimientoOptions = getEstablecimientoOptions(filters);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros
        </div>
        {exportHref && (
          <a
            href={exportHref}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 transition-all duration-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar Excel
          </a>
        )}
      </div>
      <div className="flex flex-wrap gap-3">
        <Combobox
          label="Red / CESFAM"
          value={filters.red}
          options={REDES.map((r) => r.cesfam)}
          onChange={(red) =>
            onChange({
              ...filters,
              red,
              establecimiento: null,
              estamento: null,
              profesional: null,
              prestacion: null,
              estado: null,
            })
          }
        />
        <Combobox
          label="Establecimiento"
          value={filters.establecimiento}
          options={establecimientoOptions}
          onChange={(establecimiento) =>
            onChange({
              ...filters,
              establecimiento,
              estamento: null,
              profesional: null,
              prestacion: null,
              estado: null,
            })
          }
        />
        <Combobox
          label="Estamento"
          value={filters.estamento}
          options={options?.estamentos ?? []}
          disabled={loading}
          onChange={(estamento) =>
            onChange({ ...filters, estamento, profesional: null, prestacion: null, estado: null })
          }
        />
        <Combobox
          label="Profesional"
          value={filters.profesional}
          options={options?.profesionales ?? []}
          disabled={loading}
          onChange={(profesional) =>
            onChange({ ...filters, profesional, prestacion: null, estado: null })
          }
        />
        <Combobox
          label="Prestación / Actividad"
          value={filters.prestacion}
          options={options?.prestaciones ?? []}
          disabled={loading}
          onChange={(prestacion) => onChange({ ...filters, prestacion, estado: null })}
        />
        <Combobox
          label="Estado de cita"
          value={filters.estado}
          options={options?.estados ?? []}
          disabled={loading}
          onChange={(estado) => onChange({ ...filters, estado })}
        />
      </div>
    </div>
  );
}
