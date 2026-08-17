"use client";

import { Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DateField } from "@/components/ui/date-field";
import { ErrorBanner } from "@/components/ui/error-banner";
import { REDES } from "@/lib/establecimientos";
import type { ReporteDimension, ReporteFila, ReporteGenerado, ReporteGranularidad } from "@/lib/types";
import { useAvailableYears } from "@/lib/use-available-years";
import { ReporteBarChart } from "./ReporteBarChart";

const DIMENSIONES: { value: ReporteDimension; label: string }[] = [
  { value: "periodo", label: "Por Período" },
  { value: "profesional", label: "Por Profesional" },
  { value: "prestacion", label: "Por Prestación" },
  { value: "tipoAtencion", label: "Por Tipo de Atención" },
  { value: "estamento", label: "Por Estamento" },
  { value: "estado", label: "Por Estado de Atención" },
];

const GRANULARIDADES: { value: ReporteGranularidad; label: string }[] = [
  { value: "dia", label: "Día" },
  { value: "semana", label: "Semana" },
  { value: "mes", label: "Mes" },
];

const ESTABLECIMIENTOS = REDES.flatMap((r) => [r.cesfam, ...r.dependencias]);

const COLUMNS: DataTableColumn<ReporteFila>[] = [
  { key: "clave", label: "Categoría", sortable: true, render: (r) => r.clave },
  {
    key: "registros",
    label: "Registros",
    sortable: true,
    align: "right",
    render: (r) => r.registros.toLocaleString("es-CL"),
    sortValue: (r) => r.registros,
  },
  {
    key: "atendidas",
    label: "Atendidas",
    sortable: true,
    align: "right",
    render: (r) => r.atendidas.toLocaleString("es-CL"),
    sortValue: (r) => r.atendidas,
  },
  {
    key: "noAtendidas",
    label: "No Atendidas",
    sortable: true,
    align: "right",
    render: (r) => r.noAtendidas.toLocaleString("es-CL"),
    sortValue: (r) => r.noAtendidas,
  },
  {
    key: "canceladas",
    label: "Canceladas",
    sortable: true,
    align: "right",
    render: (r) => r.canceladas.toLocaleString("es-CL"),
    sortValue: (r) => r.canceladas,
  },
  {
    key: "otros",
    label: "Otros",
    sortable: true,
    align: "right",
    render: (r) => r.otros.toLocaleString("es-CL"),
    sortValue: (r) => r.otros,
  },
  {
    key: "tasaAtencion",
    label: "% Atención",
    sortable: true,
    align: "right",
    render: (r) => `${r.tasaAtencion}%`,
    sortValue: (r) => r.tasaAtencion,
  },
];

export function ReportGenerator() {
  const [dimension, setDimension] = useState<ReporteDimension>("periodo");
  const [granularidad, setGranularidad] = useState<ReporteGranularidad>("mes");
  const [establecimiento, setEstablecimiento] = useState<string | null>(null);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);

  const [data, setData] = useState<ReporteGenerado | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const availableYears = useAvailableYears();

  function selectYear(year: number | null) {
    if (year === null) {
      setFrom(null);
      setTo(null);
    } else {
      setFrom(`${year}-01-01`);
      setTo(`${year}-12-31`);
    }
  }

  const query = useMemo(() => {
    const params = new URLSearchParams({ dimension, granularidad });
    if (establecimiento) params.set("establecimiento", establecimiento);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return params.toString();
  }, [dimension, granularidad, establecimiento, from, to]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/reportes/generar?${query}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? `El servidor respondió ${res.status}.`);
        return body as ReporteGenerado;
      })
      .then((r) => {
        if (!cancelled) {
          setData(r);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, retryKey]);

  const chartData = (data?.filas ?? []).map((f) => ({ label: f.clave, cantidad: f.registros }));

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Generador de reportes</h3>
        <p className="mt-1 text-xs text-slate-500">
          Elige cómo agrupar la producción y, si quieres, acota por establecimiento o rango de fechas.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {DIMENSIONES.map((d) => (
          <button
            key={d.value}
            type="button"
            onClick={() => setDimension(d.value)}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none ${
              dimension === d.value
                ? "bg-primary-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      {dimension === "periodo" && (
        <div className="space-y-2.5">
          <div className="flex gap-1.5">
            {GRANULARIDADES.map((g) => (
              <button
                key={g.value}
                type="button"
                onClick={() => setGranularidad(g.value)}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none ${
                  granularidad === g.value
                    ? "bg-primary-50 text-primary-700"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          {availableYears.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400">Año:</span>
              <button
                type="button"
                onClick={() => selectYear(null)}
                className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none ${
                  from === null && to === null
                    ? "bg-primary-50 text-primary-700"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                Todos
              </button>
              {availableYears.map((year) => (
                <button
                  key={year}
                  type="button"
                  onClick={() => selectYear(year)}
                  className={`cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none ${
                    from === `${year}-01-01` && to === `${year}-12-31`
                      ? "bg-primary-50 text-primary-700"
                      : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {year}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 pt-4">
        <Combobox
          label="Establecimiento"
          value={establecimiento}
          options={ESTABLECIMIENTOS}
          onChange={setEstablecimiento}
        />
        <div className="flex min-w-[150px] flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Desde</span>
          <DateField ariaLabel="Desde" value={from} onChange={setFrom} />
        </div>
        <div className="flex min-w-[150px] flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Hasta</span>
          <DateField ariaLabel="Hasta" value={to} onChange={setTo} />
        </div>
        <a
          href={`/api/reportes/generar?${query}&format=xlsx`}
          className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 shadow-sm transition-all duration-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none"
          title="Incluye hoja Resumen (agrupado) y hoja Detalle (grano completo)"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar Excel
        </a>
      </div>

      {error && <ErrorBanner message={error} onRetry={() => setRetryKey((k) => k + 1)} />}

      {data?.totales && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-lg bg-slate-50 px-3 py-2.5">
            <p className="text-xs text-slate-500">Registros</p>
            <p className="text-lg font-bold tabular-nums text-slate-800">
              {data.totales.registros.toLocaleString("es-CL")}
            </p>
          </div>
          <div className="rounded-lg bg-teal-50 px-3 py-2.5">
            <p className="text-xs text-teal-700">Atendidas</p>
            <p className="text-lg font-bold tabular-nums text-teal-800">
              {data.totales.atendidas.toLocaleString("es-CL")}
            </p>
          </div>
          <div className="rounded-lg bg-red-50 px-3 py-2.5">
            <p className="text-xs text-red-700">No Atendidas</p>
            <p className="text-lg font-bold tabular-nums text-red-800">
              {data.totales.noAtendidas.toLocaleString("es-CL")}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2.5">
            <p className="text-xs text-slate-500">Canceladas</p>
            <p className="text-lg font-bold tabular-nums text-slate-800">
              {data.totales.canceladas.toLocaleString("es-CL")}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2.5">
            <p className="text-xs text-slate-500">Otros</p>
            <p className="text-lg font-bold tabular-nums text-slate-800">
              {data.totales.otros.toLocaleString("es-CL")}
            </p>
          </div>
        </div>
      )}

      <ReporteBarChart data={chartData} loading={loading && !data} capToTop={dimension !== "periodo"} />

      {data && (
        <DataTable
          columns={COLUMNS}
          rows={data.filas}
          searchPlaceholder="Buscar categoría…"
          searchText={(r) => r.clave}
          defaultSortKey={dimension === "periodo" ? undefined : "registros"}
          emptyMessage="Sin datos para estos filtros."
          bare
        />
      )}
    </Card>
  );
}
