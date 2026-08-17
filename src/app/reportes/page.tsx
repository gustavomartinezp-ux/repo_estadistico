"use client";

import { motion } from "framer-motion";
import { Activity, AlertOctagon, AlertTriangle, ChevronRight, Download, FileSpreadsheet, UploadCloud } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { ReportGenerator } from "@/components/reportes/ReportGenerator";
import { Card } from "@/components/ui/card";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import type { EtlReport } from "@/lib/types";

function formatFechaHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" });
}

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

function CargaCard({ r }: { r: EtlReport }) {
  const hasCorrupted = Object.keys(r.etiquetasCorruptasDetectadas).length > 0;
  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 shadow-sm">
            <FileSpreadsheet className="h-4 w-4 text-white" />
          </span>
          <div>
            <p className="text-sm font-medium text-slate-800">{r.archivoFuente}</p>
            <p className="text-xs text-slate-500">{r.establecimientosDetectados.join(", ")}</p>
          </div>
        </div>
        <p className="shrink-0 text-xs text-slate-500">{formatFechaHora(r.generadoEn)}</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">Leídas</p>
          <p className="text-sm font-bold tabular-nums text-slate-800">
            {r.filasLeidas.toLocaleString("es-CL")}
          </p>
        </div>
        <div className="rounded-lg bg-primary-50 px-3 py-2">
          <p className="text-xs text-primary-700">Agregadas</p>
          <p className="text-sm font-bold tabular-nums text-primary-800">
            {r.filasValidasAgregadas.toLocaleString("es-CL")}
          </p>
        </div>
        {(r.filasReparadas ?? 0) > 0 && (
          <div className="rounded-lg bg-teal-50 px-3 py-2">
            <p className="text-xs text-teal-700">Reparadas</p>
            <p className="text-sm font-bold tabular-nums text-teal-800">
              {r.filasReparadas.toLocaleString("es-CL")}
            </p>
          </div>
        )}
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">Descartadas</p>
          <p className="text-sm font-bold tabular-nums text-slate-800">
            {(r.filasDescartadasPorCorrupcion + r.filasDescartadasPorCamposFaltantes).toLocaleString("es-CL")}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">Rango</p>
          <p className="text-sm font-bold text-slate-800">
            {formatFecha(r.rangoFechas.desde)} – {formatFecha(r.rangoFechas.hasta)}
          </p>
        </div>
      </div>

      {hasCorrupted && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>{r.filasDescartadasPorCorrupcion.toLocaleString("es-CL")} filas descartadas por datos corruptos.</p>
        </div>
      )}
    </Card>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function ReportesPage() {
  const [data, setData] = useState<EtlReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/reportes")
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? `El servidor respondió ${res.status}.`);
        return body.cargas as EtlReport[];
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

  return (
    <AppShell
      title="Reportes"
      rightSlot={
        <a
          href="/api/export"
          className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary-600 to-primary-700 px-3.5 py-2 text-xs font-medium text-white shadow-sm transition-all duration-200 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar dataset completo
        </a>
      }
    >
      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">
        <motion.div variants={fadeUp} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-sm">
            <Activity className="h-5 w-5 text-white" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Reportes de producción</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Genera reportes flexibles por dimensión y consulta el historial de cargas.
            </p>
          </div>
        </motion.div>

        <motion.div variants={fadeUp} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
          <motion.div whileHover={{ y: -2 }} transition={{ type: "spring", stiffness: 320, damping: 24 }}>
            <Link
              href="/reportes/inasistencias"
              className="group flex items-center justify-between gap-4 rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-orange-50/50 p-4 shadow-sm transition-all duration-200 hover:border-red-300 hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-orange-500 shadow-sm">
                  <AlertOctagon className="h-5 w-5 text-white" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Reporte de inasistencias (NSP)</p>
                  <p className="text-xs text-slate-500">
                    Citas No Atendidas por "Paciente No se Presentó" — tasa por profesional, día de la semana y prestación.
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-red-300 transition-colors duration-200 group-hover:text-red-500" />
            </Link>
          </motion.div>
        </motion.div>

        <motion.div variants={fadeUp} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
          <ReportGenerator />
        </motion.div>

        <motion.div variants={fadeUp} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="space-y-6">
          <div className="flex items-center gap-3 border-t border-slate-200 pt-6">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sky-400 to-accent-600 shadow-sm">
              <Activity className="h-4 w-4 text-white" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Historial de cargas</h2>
              <p className="text-sm text-slate-500">
                Registro de cada informe subido en{" "}
                <Link href="/cargar" className="text-primary-600 hover:underline">
                  Cargar Informe
                </Link>
                .
              </p>
            </div>
          </div>

          {error && <ErrorBanner message={error} onRetry={() => setRetryKey((k) => k + 1)} />}

          {!data && !error && (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="mt-3 h-16 w-full" />
                </Card>
              ))}
            </div>
          )}

          {data && data.length === 0 && (
            <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white text-center shadow-sm">
              <UploadCloud className="h-8 w-8 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">Todavía no se ha cargado ningún informe</p>
              <Link href="/cargar" className="text-sm text-primary-600 hover:underline">
                Ir a Cargar Informe
              </Link>
            </div>
          )}

          {data && data.length > 0 && (
            <div className="space-y-3">
              {data.map((r, i) => (
                <CargaCard key={i} r={r} />
              ))}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AppShell>
  );
}
