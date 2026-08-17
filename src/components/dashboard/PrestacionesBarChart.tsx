"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CategoryAggregate } from "@/lib/types";

const MAX_BARS = 10;
// design-tokens/tokens.json -> colors.primary.500 / .accent.500 (degradé índigo -> cian)
const GRADIENT_TOP = "#675fe8";
const GRADIENT_BOTTOM = "#4f46e5";
const SERIES_COLOR_HOVER = "#06b6d4";

const TITLES: Record<"prestacion" | "profesional", string> = {
  prestacion: "Atenciones por tipo de prestación",
  profesional: "Atenciones por profesional",
};

const UNIT_LABEL: Record<"prestacion" | "profesional", string> = {
  prestacion: "prestaciones distintas",
  profesional: "profesionales distintos",
};

function truncate(label: string, max = 16): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function AxisTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return (
    <text
      x={x}
      y={y}
      dy={12}
      dx={-4}
      textAnchor="end"
      transform={`rotate(-30, ${x}, ${y})`}
      fontSize={11}
      fill="#64748b"
    >
      {truncate(payload?.value ?? "")}
    </text>
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: CategoryAggregate }>;
}) {
  if (!active || !payload?.length) return null;
  const { label, cantidad } = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-lg">
      <p className="max-w-[220px] font-medium text-slate-800">{label}</p>
      <p className="mt-0.5 text-slate-500">
        <span className="font-semibold text-primary-600">{cantidad.toLocaleString("es-CL")}</span>{" "}
        atenciones
      </p>
    </div>
  );
}

interface PrestacionesBarChartProps {
  groupBy: "prestacion" | "profesional";
  data: CategoryAggregate[];
  /** true mientras se espera la primera respuesta del API (sin datos previos que mostrar). */
  loading?: boolean;
}

function ChartSkeleton() {
  const heights = [88, 62, 74, 50, 68, 40, 56, 34, 46, 30];
  return (
    <div className="flex h-[340px] items-end gap-4 px-1 pb-8">
      {heights.map((h, i) => (
        <Skeleton key={i} className="flex-1 rounded-t-md rounded-b-none" style={{ height: `${h}%` }} />
      ))}
    </div>
  );
}

export function PrestacionesBarChart({ groupBy, data, loading = false }: PrestacionesBarChartProps) {
  const top = data.slice(0, MAX_BARS);
  const showSkeleton = loading && data.length === 0;

  return (
    <Card>
      <style>{`.recharts-bar-rectangle path { transition: fill 200ms ease; }`}</style>

      <h3 className="text-sm font-semibold text-slate-800">{TITLES[groupBy]}</h3>
      <p className="mb-4 text-xs text-slate-500">
        {showSkeleton
          ? "Cargando…"
          : data.length > MAX_BARS
            ? `Top ${MAX_BARS} de ${data.length} ${UNIT_LABEL[groupBy]} · según filtros aplicados`
            : "Según filtros aplicados"}
      </p>

      {showSkeleton ? (
        <ChartSkeleton />
      ) : top.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-slate-500">
          Sin datos para los filtros seleccionados
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={top} margin={{ top: 8, right: 8, left: 0, bottom: 48 }} barCategoryGap="28%">
            <defs>
              <linearGradient id="prestacionesBarFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={GRADIENT_TOP} />
                <stop offset="100%" stopColor={GRADIENT_BOTTOM} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="label"
              interval={0}
              tick={<AxisTick />}
              tickLine={false}
              axisLine={{ stroke: "#e2e8f0" }}
            />
            <YAxis
              allowDecimals={false}
              stroke="#94a3b8"
              tick={{ fill: "#94a3b8", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip cursor={{ fill: "#f1f5f9" }} content={<CustomTooltip />} />
            <Bar
              dataKey="cantidad"
              fill="url(#prestacionesBarFill)"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
              activeBar={{ fill: SERIES_COLOR_HOVER }}
              animationDuration={700}
              animationEasing="ease-out"
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
