"use client";

import { motion } from "framer-motion";
import { Building2, CheckCircle2, ChevronRight, ClipboardList } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, KpiCard } from "@/components/ui/card";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { REDES } from "@/lib/establecimientos";
import type { EstablecimientoSummary } from "@/lib/types";

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

function EstablecimientoCard({ summary, dependencia }: { summary: EstablecimientoSummary; dependencia?: boolean }) {
  const sinDatos = summary.totalRegistros === 0;

  return (
    <Link
      href={`/?establecimiento=${encodeURIComponent(summary.nombre)}`}
      className={`group flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-200 hover:border-primary-300 hover:shadow-md ${dependencia ? "ml-6" : ""}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          sinDatos
            ? "bg-slate-100 text-slate-400"
            : `bg-gradient-to-br text-white shadow-sm ${dependencia ? "from-accent-400 to-primary-600" : "from-primary-500 to-primary-600"}`
        }`}
      >
        <Building2 className="h-4 w-4" />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{summary.nombre}</p>
        {sinDatos ? (
          <p className="mt-1 text-xs text-slate-500">Sin datos cargados</p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
            <span>
              <span className="font-semibold tabular-nums text-slate-700">
                {summary.totalRegistros.toLocaleString("es-CL")}
              </span>{" "}
              registros
            </span>
            <span>
              <span className="font-semibold tabular-nums text-slate-700">
                {summary.profesionalesActivos}
              </span>{" "}
              profesionales
            </span>
            <span>
              <span className="font-semibold tabular-nums text-slate-700">
                {summary.prestacionesDistintas}
              </span>{" "}
              prestaciones
            </span>
            <span>
              {formatFecha(summary.rangoFechas.desde)} – {formatFecha(summary.rangoFechas.hasta)}
            </span>
          </div>
        )}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors duration-200 group-hover:text-primary-500" />
    </Link>
  );
}

function CardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-64" />
      </div>
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function EstablecimientosPage() {
  const [data, setData] = useState<EstablecimientoSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/establecimientos")
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? `El servidor respondió ${res.status}.`);
        return body.establecimientos as EstablecimientoSummary[];
      })
      .then((rows) => {
        if (!cancelled) setData(rows);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const byNombre = new Map((data ?? []).map((s) => [s.nombre, s]));

  const stats = useMemo(() => {
    if (!data) return null;
    const conDatos = data.filter((s) => s.totalRegistros > 0);
    const totalRegistros = conDatos.reduce((s, r) => s + r.totalRegistros, 0);
    const totalAtendidas = conDatos.reduce((s, r) => s + r.totalAtendidas, 0);
    return {
      conDatos: conDatos.length,
      totalRegistros,
      pctAtendidas: totalRegistros ? Math.round((totalAtendidas / totalRegistros) * 100) : 0,
    };
  }, [data]);

  return (
    <AppShell title="Establecimientos">
      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">
        <motion.div variants={fadeUp} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-sm">
            <Building2 className="h-5 w-5 text-white" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Red de establecimientos APS</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Toca un establecimiento para ver su producción en el Dashboard.
            </p>
          </div>
        </motion.div>

        {error && <ErrorBanner message={error} onRetry={() => setRetryKey((k) => k + 1)} />}

        <motion.div variants={fadeUp} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label="Con datos cargados"
            value={stats?.conDatos ?? null}
            hint={`De ${REDES.reduce((s, r) => s + 1 + r.dependencias.length, 0)} establecimientos en la red`}
            icon={Building2}
            gradient="from-primary-500 to-primary-600"
            glow="rgba(79, 70, 229, 0.3)"
            loading={!data && !error}
          />
          <KpiCard
            label="Registros"
            value={stats?.totalRegistros ?? null}
            hint="Suma de establecimientos con datos"
            icon={ClipboardList}
            gradient="from-sky-400 to-accent-600"
            glow="rgba(8, 145, 178, 0.3)"
            loading={!data && !error}
          />
          <KpiCard
            label="% Atendidas"
            value={stats?.pctAtendidas ?? null}
            hint="Promedio general"
            icon={CheckCircle2}
            gradient="from-emerald-400 to-teal-600"
            glow="rgba(13, 148, 136, 0.3)"
            suffix="%"
            loading={!data && !error}
          />
        </motion.div>

        {!data && !error && (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        )}

        {data && (
          <motion.div variants={fadeUp} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="space-y-6">
            {REDES.map((red) => {
              const cabecera = byNombre.get(red.cesfam);
              if (!cabecera) return null;
              return (
                <Card key={red.cesfam} className="space-y-3">
                  <EstablecimientoCard summary={cabecera} />
                  {red.dependencias.map((dep) => {
                    const s = byNombre.get(dep);
                    return s ? <EstablecimientoCard key={dep} summary={s} dependencia /> : null;
                  })}
                </Card>
              );
            })}
          </motion.div>
        )}
      </motion.div>
    </AppShell>
  );
}
