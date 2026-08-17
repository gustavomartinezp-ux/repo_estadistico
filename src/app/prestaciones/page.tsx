"use client";

import { motion } from "framer-motion";
import { ClipboardCheck, ClipboardList, Stethoscope } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, KpiCard } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import type { PrestacionSummary } from "@/lib/types";

const COLUMNS: DataTableColumn<PrestacionSummary>[] = [
  {
    key: "nombre",
    label: "Prestación",
    sortable: true,
    render: (r) => (
      <span className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white">
          <Stethoscope className="h-[15px] w-[15px]" />
        </span>
        {r.nombre}
      </span>
    ),
    sortValue: (r) => r.nombre,
  },
  { key: "estamentos", label: "Estamento(s)", render: (r) => r.estamentos.join(", ") },
  {
    key: "totalRegistros",
    label: "Registros",
    sortable: true,
    align: "right",
    render: (r) => r.totalRegistros.toLocaleString("es-CL"),
    sortValue: (r) => r.totalRegistros,
  },
  {
    key: "totalAtendidas",
    label: "Atendidas",
    sortable: true,
    align: "right",
    render: (r) => r.totalAtendidas.toLocaleString("es-CL"),
    sortValue: (r) => r.totalAtendidas,
  },
  {
    key: "profesionalesDistintos",
    label: "Profesionales",
    sortable: true,
    align: "right",
    render: (r) => r.profesionalesDistintos,
    sortValue: (r) => r.profesionalesDistintos,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function PrestacionesPage() {
  const [data, setData] = useState<PrestacionSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/prestaciones")
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? `El servidor respondió ${res.status}.`);
        return body.prestaciones as PrestacionSummary[];
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

  const stats = useMemo(() => {
    if (!data) return null;
    const totalRegistros = data.reduce((s, r) => s + r.totalRegistros, 0);
    const totalAtendidas = data.reduce((s, r) => s + r.totalAtendidas, 0);
    return {
      totalPrestaciones: data.length,
      totalRegistros,
      pctAtendidas: totalRegistros ? Math.round((totalAtendidas / totalRegistros) * 100) : 0,
    };
  }, [data]);

  return (
    <AppShell title="Prestaciones">
      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">
        <motion.div variants={fadeUp} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-sm">
            <Stethoscope className="h-5 w-5 text-white" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Tipos de prestación registrados</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Haz click en una prestación para ver quién la realiza en el Dashboard.
            </p>
          </div>
        </motion.div>

        {error && <ErrorBanner message={error} onRetry={() => setRetryKey((k) => k + 1)} />}

        <motion.div variants={fadeUp} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label="Prestaciones"
            value={stats?.totalPrestaciones ?? null}
            hint="Tipos distintos registrados"
            icon={Stethoscope}
            gradient="from-amber-400 to-orange-500"
            glow="rgba(217, 119, 6, 0.3)"
            loading={!data && !error}
          />
          <KpiCard
            label="Registros"
            value={stats?.totalRegistros ?? null}
            hint="Suma de todas las prestaciones"
            icon={ClipboardList}
            gradient="from-primary-500 to-primary-600"
            glow="rgba(79, 70, 229, 0.3)"
            loading={!data && !error}
          />
          <KpiCard
            label="% Atendidas"
            value={stats?.pctAtendidas ?? null}
            hint="Promedio general"
            icon={ClipboardCheck}
            gradient="from-emerald-400 to-teal-600"
            glow="rgba(13, 148, 136, 0.3)"
            suffix="%"
            loading={!data && !error}
          />
        </motion.div>

        {!data && !error && (
          <Card>
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full" />
              ))}
            </div>
          </Card>
        )}

        {data && (
          <motion.div variants={fadeUp} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}>
            <DataTable
              columns={COLUMNS}
              rows={data}
              searchPlaceholder="Buscar prestación…"
              searchText={(r) => r.nombre}
              defaultSortKey="totalRegistros"
              rowHref={(r) => `/?prestacion=${encodeURIComponent(r.nombre)}`}
            />
          </motion.div>
        )}
      </motion.div>
    </AppShell>
  );
}
