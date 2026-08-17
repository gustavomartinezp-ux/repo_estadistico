"use client";

import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ClipboardList, Stethoscope, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { FilterBar } from "@/components/dashboard/FilterBar";
import { PrestacionesBarChart } from "@/components/dashboard/PrestacionesBarChart";
import { Footer } from "@/components/layout/Footer";
import { GlobalDateRangePicker } from "@/components/layout/GlobalDateRangePicker";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ErrorBanner } from "@/components/ui/error-banner";
import { KpiCard } from "@/components/ui/card";
import { TopProgressBar } from "@/components/ui/top-progress-bar";
import { EMPTY_FILTERS } from "@/lib/filter-utils";
import type { AtencionesResponse, DashboardFilters } from "@/lib/types";

function buildQuery(filters: DashboardFilters): string {
  const params = new URLSearchParams();
  if (filters.red) params.set("red", filters.red);
  if (filters.establecimiento) params.set("establecimiento", filters.establecimiento);
  if (filters.estamento) params.set("estamento", filters.estamento);
  if (filters.profesional) params.set("profesional", filters.profesional);
  if (filters.prestacion) params.set("prestacion", filters.prestacion);
  if (filters.estado) params.set("estado", filters.estado);
  if (filters.dateRange.from) params.set("from", filters.dateRange.from);
  if (filters.dateRange.to) params.set("to", filters.dateRange.to);
  return params.toString();
}

/** Lee ?establecimiento=/?profesional=/?prestacion=/?estamento=/?red= una sola vez, para
 * que otras páginas (Establecimientos/Profesionales/Prestaciones) puedan linkear
 * directo a un Dashboard ya filtrado. */
function initialFiltersFromSearchParams(searchParams: URLSearchParams): DashboardFilters {
  return {
    ...EMPTY_FILTERS,
    red: searchParams.get("red"),
    establecimiento: searchParams.get("establecimiento"),
    estamento: searchParams.get("estamento"),
    profesional: searchParams.get("profesional"),
    prestacion: searchParams.get("prestacion"),
    estado: searchParams.get("estado"),
  };
}

const GENERIC_ERROR = "No se pudo conectar con el servidor. Revisa tu conexión e intenta de nuevo.";

function DashboardContent() {
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState<DashboardFilters>(() =>
    initialFiltersFromSearchParams(searchParams)
  );
  const [response, setResponse] = useState<AtencionesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetch(`/api/atenciones?${buildQuery(filters)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) {
          throw new Error(body?.error ?? `El servidor respondió ${res.status}.`);
        }
        return body as AtencionesResponse;
      })
      .then((data) => {
        if (cancelled) return;
        setResponse(data);
        setError(null);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message || GENERIC_ERROR);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [filters, retryKey]);

  const retry = useCallback(() => setRetryKey((k) => k + 1), []);

  const kpis = response?.kpis;
  const firstLoad = response === null;
  const showSkeletons = loading && firstLoad;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="das-ambient-bg" aria-hidden />
      <TopProgressBar active={loading && !firstLoad} />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-60">
        <Topbar
          title="Producción Estadística APS"
          onMenuClick={() => setSidebarOpen(true)}
          rightSlot={
            <GlobalDateRangePicker
              value={filters.dateRange}
              onChange={(dateRange) => setFilters({ ...filters, dateRange })}
            />
          }
        />

        <main className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
          <AnimatePresence>
            {error && <ErrorBanner key="error-banner" message={error} onRetry={retry} />}
          </AnimatePresence>

          <FilterBar
            filters={filters}
            onChange={setFilters}
            options={response?.options ?? null}
            loading={loading}
            exportHref={`/api/export?${buildQuery(filters)}`}
          />

          {firstLoad && error ? (
            <div className="flex h-64 flex-col items-center justify-center gap-1 rounded-2xl border border-slate-200 bg-white text-center shadow-sm">
              <p className="text-sm font-medium text-slate-700">No se pudieron cargar los datos</p>
              <p className="text-xs text-slate-500">Usa "Reintentar" arriba una vez resuelto el problema.</p>
            </div>
          ) : (
            <motion.div
              key={firstLoad ? "first" : "loaded"}
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
              className="space-y-6"
            >
              <motion.div
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
              >
                <KpiCard
                  label="Registros"
                  value={kpis?.totalRegistros ?? null}
                  hint="Total según filtros"
                  icon={ClipboardList}
                  gradient="from-primary-500 to-primary-600"
                  glow="rgba(79, 70, 229, 0.3)"
                  loading={showSkeletons}
                />
                <KpiCard
                  label="Atendidas"
                  value={kpis?.totalAtendidas ?? null}
                  hint="Estado = Atendido"
                  icon={CheckCircle2}
                  gradient="from-emerald-400 to-teal-600"
                  glow="rgba(13, 148, 136, 0.3)"
                  loading={showSkeletons}
                />
                <KpiCard
                  label="Profesionales"
                  value={kpis?.profesionalesActivos ?? null}
                  hint="Con actividad registrada"
                  icon={Users}
                  gradient="from-fuchsia-500 to-violet-600"
                  glow="rgba(147, 51, 234, 0.3)"
                  loading={showSkeletons}
                />
                <KpiCard
                  label="Prestaciones distintas"
                  value={kpis?.prestacionesDistintas ?? null}
                  hint="Tipos de prestación"
                  icon={Stethoscope}
                  gradient="from-amber-400 to-orange-500"
                  glow="rgba(217, 119, 6, 0.3)"
                  loading={showSkeletons}
                />
              </motion.div>

              <motion.div
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <PrestacionesBarChart
                  groupBy={response?.chart.groupBy ?? "prestacion"}
                  data={response?.chart.data ?? []}
                  loading={showSkeletons}
                />
              </motion.div>
            </motion.div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
