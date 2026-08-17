"use client";

import { motion } from "framer-motion";
import { ClipboardCheck, ClipboardList, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, KpiCard } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ErrorBanner } from "@/components/ui/error-banner";
import { Skeleton } from "@/components/ui/skeleton";
import { avatarGradientFor, initialsFor } from "@/lib/avatar";
import type { ProfesionalSummary } from "@/lib/types";

const COLUMNS: DataTableColumn<ProfesionalSummary>[] = [
  {
    key: "nombre",
    label: "Profesional",
    sortable: true,
    render: (r) => (
      <span className="flex items-center gap-2.5">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarGradientFor(r.nombre)} text-[11px] font-semibold text-white`}
        >
          {initialsFor(r.nombre)}
        </span>
        {r.nombre}
      </span>
    ),
    sortValue: (r) => r.nombre,
  },
  { key: "estamento", label: "Estamento", sortable: true, render: (r) => r.estamento },
  {
    key: "establecimientos",
    label: "Establecimiento(s)",
    render: (r) => r.establecimientos.join(", "),
  },
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
    key: "pctAtendidas",
    label: "% Atendidas",
    sortable: true,
    align: "right",
    render: (r) => (r.totalRegistros ? `${Math.round((r.totalAtendidas / r.totalRegistros) * 100)}%` : "—"),
    sortValue: (r) => (r.totalRegistros ? r.totalAtendidas / r.totalRegistros : 0),
  },
  {
    key: "prestacionesDistintas",
    label: "Prestaciones",
    sortable: true,
    align: "right",
    render: (r) => r.prestacionesDistintas,
    sortValue: (r) => r.prestacionesDistintas,
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function ProfesionalesPage() {
  const [data, setData] = useState<ProfesionalSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/profesionales")
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? `El servidor respondió ${res.status}.`);
        return body.profesionales as ProfesionalSummary[];
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
      totalProfesionales: data.length,
      totalRegistros,
      pctAtendidas: totalRegistros ? Math.round((totalAtendidas / totalRegistros) * 100) : 0,
    };
  }, [data]);

  return (
    <AppShell title="Profesionales">
      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }} className="space-y-6">
        <motion.div variants={fadeUp} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-violet-600 shadow-sm">
            <Users className="h-5 w-5 text-white" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Profesionales con actividad registrada</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Haz click en un profesional para ver su producción en el Dashboard.
            </p>
          </div>
        </motion.div>

        {error && <ErrorBanner message={error} onRetry={() => setRetryKey((k) => k + 1)} />}

        <motion.div variants={fadeUp} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <KpiCard
            label="Profesionales"
            value={stats?.totalProfesionales ?? null}
            hint="Con actividad registrada"
            icon={Users}
            gradient="from-fuchsia-500 to-violet-600"
            glow="rgba(147, 51, 234, 0.3)"
            loading={!data && !error}
          />
          <KpiCard
            label="Registros"
            value={stats?.totalRegistros ?? null}
            hint="Suma de todos los profesionales"
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
              searchPlaceholder="Buscar profesional…"
              searchText={(r) => `${r.nombre} ${r.estamento}`}
              defaultSortKey="totalRegistros"
              rowHref={(r) => `/?profesional=${encodeURIComponent(r.nombre)}`}
            />
          </motion.div>
        )}
      </motion.div>
    </AppShell>
  );
}
