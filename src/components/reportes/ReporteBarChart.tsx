"use client";

import { useId } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const MAX_BARS = 15;
const GRADIENT_TOP = "#675fe8";
const GRADIENT_BOTTOM = "#4f46e5";
const SERIES_COLOR_HOVER = "#06b6d4";

function truncate(label: string, max = 20): string {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}

function AxisTick({ x, y, payload }: { x?: number; y?: number; payload?: { value: string } }) {
  return (
    <text x={x} y={y} dy={12} dx={-4} textAnchor="end" transform={`rotate(-30, ${x}, ${y})`} fontSize={11} fill="#64748b">
      {truncate(payload?.value ?? "")}
    </text>
  );
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: { label: string; cantidad: number } }>;
}) {
  if (!active || !payload?.length) return null;
  const { label, cantidad } = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm shadow-lg">
      <p className="max-w-[240px] font-medium text-slate-800">{label}</p>
      <p className="mt-0.5 text-slate-500">
        <span className="font-semibold text-primary-600">{cantidad.toLocaleString("es-CL")}</span> registros
      </p>
    </div>
  );
}

interface ReporteBarChartProps {
  data: Array<{ label: string; cantidad: number }>;
  loading?: boolean;
  /** false = ordenar cronológicamente (dimensión "periodo"); true = ya viene top-N por cantidad. */
  capToTop?: boolean;
}

export function ReporteBarChart({ data, loading = false, capToTop = true }: ReporteBarChartProps) {
  const gradientId = `reporteBarFill-${useId()}`;
  const shown = capToTop ? data.slice(0, MAX_BARS) : data;

  if (loading) {
    return (
      <Card>
        <div className="flex h-[280px] items-end gap-3 px-1 pb-8">
          {[70, 45, 85, 30, 60, 40, 55].map((h, i) => (
            <Skeleton key={i} className="flex-1 rounded-t-md rounded-b-none" style={{ height: `${h}%` }} />
          ))}
        </div>
      </Card>
    );
  }

  if (shown.length === 0) {
    return (
      <Card>
        <div className="flex h-56 items-center justify-center text-sm text-slate-500">
          Sin datos para los filtros seleccionados
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <style>{`.recharts-bar-rectangle path { transition: fill 200ms ease; }`}</style>
      {capToTop && data.length > MAX_BARS && (
        <p className="mb-3 text-xs text-slate-500">
          Top {MAX_BARS} de {data.length}
        </p>
      )}
      <ResponsiveContainer width="100%" height={Math.max(280, shown.length * 8)}>
        <BarChart data={shown} margin={{ top: 8, right: 8, left: 0, bottom: 48 }} barCategoryGap="28%">
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GRADIENT_TOP} />
              <stop offset="100%" stopColor={GRADIENT_BOTTOM} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" interval={0} tick={<AxisTick />} tickLine={false} axisLine={{ stroke: "#e2e8f0" }} />
          <YAxis allowDecimals={false} stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} width={44} />
          <Tooltip cursor={{ fill: "#f1f5f9" }} content={<CustomTooltip />} />
          <Bar
            dataKey="cantidad"
            fill={`url(#${gradientId})`}
            radius={[6, 6, 0, 0]}
            maxBarSize={48}
            activeBar={{ fill: SERIES_COLOR_HOVER }}
            animationDuration={700}
            animationEasing="ease-out"
          />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
