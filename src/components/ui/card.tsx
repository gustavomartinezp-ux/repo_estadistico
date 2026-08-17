"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { AnimatedNumber } from "./animated-number";
import { Skeleton } from "./skeleton";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md ${className}`}
    >
      {children}
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: number | null;
  hint?: string;
  icon: LucideIcon;
  /** Clases Tailwind del degradé del ícono, ej. "from-primary-500 to-primary-600". */
  gradient?: string;
  /** Color del resplandor al pasar el mouse (rgba), a juego con `gradient`. */
  glow?: string;
  /** Texto pegado al número, ej. "%". */
  suffix?: string;
  loading?: boolean;
}

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  gradient = "from-primary-500 to-primary-600",
  glow = "rgba(79, 70, 229, 0.28)",
  suffix,
  loading = false,
}: KpiCardProps) {
  const showSkeleton = loading || value === null;
  return (
    <motion.div
      whileHover={showSkeleton ? undefined : { y: -3, boxShadow: `0 16px 32px -12px ${glow}` }}
      transition={{ type: "spring", stiffness: 320, damping: 24 }}
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div
        className={`absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-sm`}
      >
        <Icon className="h-[18px] w-[18px] text-white" />
      </div>
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      {showSkeleton ? (
        <Skeleton className="mt-2 h-8 w-24" />
      ) : (
        <p className="mt-2 text-3xl font-bold tabular-nums text-slate-800">
          <AnimatedNumber value={value} />
          {suffix}
        </p>
      )}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </motion.div>
  );
}
