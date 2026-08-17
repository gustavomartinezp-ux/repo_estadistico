"use client";

import { AlertOctagon, Download } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ReporteBarChart } from "@/components/reportes/ReporteBarChart";
import { Card } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DateField } from "@/components/ui/date-field";
import { ErrorBanner } from "@/components/ui/error-banner";
import { ESTAMENTOS_CONOCIDOS } from "@/lib/estamentos";
import { REDES } from "@/lib/establecimientos";
import type { InasistenciaFila, ReporteInasistencias } from "@/lib/types";

const ESTABLECIMIENTOS = REDES.flatMap((r) => [r.cesfam, ...r.dependencias]);

const COLUMNS: DataTableColumn<InasistenciaFila>[] = [
  { key: "clave", label: "Categoría", sortable: true, render: (r) => r.clave },
  {
    key: "totalCitas",
    label: "Total Citas",
    sortable: true,
    align: "right",
    render: (r) => r.totalCitas.toLocaleString("es-CL"),
    sortValue: (r) => r.totalCitas,
  },
  {
    key: "nsp",
    label: "No Se Presentó",
    sortable: true,
    align: "right",
    render: (r) => r.nsp.toLocaleString("es-CL"),
    sortValue: (r) => r.nsp,
  },
  {
    key: "tasaNSP",
    label: "Tasa NSP",
    sortable: true,
    align: "right",
    render: (r) => `${r.tasaNSP}%`,
    sortValue: (r) => r.tasaNSP,
  },
];

function KpiMini({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className={`rounded-lg px-3 py-2.5 ${accent ?? "bg-slate-50"}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-bold tabular-nums text-slate-800">{value}</p>
    </div>
  );
}

export default function InasistenciasPage() {
  const [establecimiento, setEstablecimiento] = useState<string | null>(null);
  const [estamento, setEstamento] = useState<string | null>(null);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);

  const [data, setData] = useState<ReporteInasistencias | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (establecimiento) params.set("establecimiento", establecimiento);
    if (estamento) params.set("estamento", estamento);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    return params.toString();
  }, [establecimiento, estamento, from, to]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/reportes/inasistencias?${query}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? `El servidor respondió ${res.status}.`);
        return body as ReporteInasistencias;
      })
      .then((r) => {
        if (!cancelled) {
          setData(r);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [query, retryKey]);

  const chartPeriodo = (data?.porPeriodo ?? []).map((f) => ({ label: f.clave, cantidad: f.nsp }));
  const chartDia = (data?.porDiaSemana ?? []).map((f) => ({ label: f.clave, cantidad: f.nsp }));

  return (
    <AppShell
      title="Inasistencias (NSP)"
      rightSlot={
        <a
          href={`/api/reportes/inasistencias?${query}&format=xlsx`}
          className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-xs font-medium text-white shadow-sm transition-all duration-200 hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar Excel
        </a>
      }
    >
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <AlertOctagon className="h-4 w-4 text-red-600" />
          Reporte exclusivo de inasistencias — Paciente No Se Presentó
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Solo citas No Atendidas cuyo motivo registrado es "Paciente No se Presentó" (NSP). La tasa se
          calcula sobre el total de citas de cada grupo, no solo sobre las inasistencias.
        </p>
      </div>

      <Card className="flex flex-wrap items-end gap-3">
        <Combobox label="Establecimiento" value={establecimiento} options={ESTABLECIMIENTOS} onChange={setEstablecimiento} />
        <Combobox
          label="Estamento"
          value={estamento}
          options={[...ESTAMENTOS_CONOCIDOS]}
          onChange={setEstamento}
        />
        <div className="flex min-w-[150px] flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Desde</span>
          <DateField ariaLabel="Desde" value={from} onChange={setFrom} />
        </div>
        <div className="flex min-w-[150px] flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-slate-500">Hasta</span>
          <DateField ariaLabel="Hasta" value={to} onChange={setTo} />
        </div>
      </Card>

      {error && <ErrorBanner message={error} onRetry={() => setRetryKey((k) => k + 1)} />}

      {data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiMini label="Total de citas" value={data.totales.totalRegistros.toLocaleString("es-CL")} />
          <KpiMini
            label="No Se Presentó (NSP)"
            value={data.totales.totalNSP.toLocaleString("es-CL")}
            accent="bg-red-50"
          />
          <KpiMini label="Tasa NSP sobre el total" value={`${data.totales.tasaNSPsobreTotal}%`} accent="bg-red-50" />
          <KpiMini
            label="NSP entre las No Atendidas"
            value={`${data.totales.tasaNSPsobreNoAtendido}%`}
            accent="bg-amber-50"
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">NSP por mes</h3>
          <ReporteBarChart data={chartPeriodo} loading={!data} capToTop={false} />
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">NSP por día de la semana</h3>
          <ReporteBarChart data={chartDia} loading={!data} capToTop={false} />
        </div>
      </div>

      {data && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Por profesional</h3>
          <DataTable
            columns={COLUMNS}
            rows={data.porProfesional}
            searchPlaceholder="Buscar profesional…"
            searchText={(r) => r.clave}
            defaultSortKey="nsp"
            emptyMessage="Sin inasistencias para estos filtros."
          />
        </div>
      )}

      {data && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Por estamento</h3>
          <DataTable
            columns={COLUMNS}
            rows={data.porEstamento}
            searchPlaceholder="Buscar estamento…"
            searchText={(r) => r.clave}
            defaultSortKey="nsp"
            emptyMessage="Sin inasistencias para estos filtros."
          />
        </div>
      )}

      {data && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Por prestación</h3>
          <p className="mb-2 text-xs text-slate-500">
            La actividad específica agendada — ej. "Control De Salud Cardiovascular", "Control Salud Mental".
          </p>
          <DataTable
            columns={COLUMNS}
            rows={data.porPrestacion}
            searchPlaceholder="Buscar prestación…"
            searchText={(r) => r.clave}
            defaultSortKey="nsp"
            emptyMessage="Sin inasistencias para estos filtros."
          />
        </div>
      )}

      {data && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-800">Por tipo de atención</h3>
          <p className="mb-2 text-xs text-slate-500">
            Consulta nueva, repetida (control), abreviada o procedimiento — distinto de la prestación.
          </p>
          <DataTable
            columns={COLUMNS}
            rows={data.porTipoAtencion}
            searchPlaceholder="Buscar tipo de atención…"
            searchText={(r) => r.clave}
            defaultSortKey="nsp"
            emptyMessage="Sin inasistencias para estos filtros."
          />
        </div>
      )}
    </AppShell>
  );
}
