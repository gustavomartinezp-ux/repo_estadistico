"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Calendar, ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DateField } from "@/components/ui/date-field";
import type { DateRange } from "@/lib/types";
import { useAvailableYears } from "@/lib/use-available-years";

function formatDDMMYYYY(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

function labelFor(range: DateRange, presets: Array<{ label: string; range: DateRange }>): string {
  const preset = presets.find((p) => p.range.from === range.from && p.range.to === range.to);
  if (preset) return preset.label;
  if (range.from && range.to) return `${formatDDMMYYYY(range.from)} – ${formatDDMMYYYY(range.to)}`;
  if (range.from) return `Desde ${formatDDMMYYYY(range.from)}`;
  if (range.to) return `Hasta ${formatDDMMYYYY(range.to)}`;
  return "Todo el período";
}

interface GlobalDateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

/** Selector de fecha global del Topbar: presets rápidos + rango personalizado. */
export function GlobalDateRangePicker({ value, onChange }: GlobalDateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const availableYears = useAvailableYears();

  const presets = useMemo<Array<{ label: string; range: DateRange }>>(
    () => [
      { label: "Todo el período", range: { from: null, to: null } },
      ...availableYears.map((year) => ({
        label: `Año ${year}`,
        range: { from: `${year}-01-01`, to: `${year}-12-31` },
      })),
    ],
    [availableYears]
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 shadow-sm transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none"
      >
        <Calendar className="h-4 w-4 text-slate-500" />
        {labelFor(value, presets)}
        <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-full right-0 z-30 mt-1.5 w-80 rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
          >
            <p className="px-1 pb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
              Rangos rápidos
            </p>
            <div className="space-y-0.5">
              {presets.map((p) => {
                const active = p.range.from === value.from && p.range.to === value.to;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      onChange(p.range);
                      setOpen(false);
                    }}
                    className={`block w-full cursor-pointer rounded-md px-2.5 py-1.5 text-left text-sm transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none ${
                      active ? "bg-primary-50 font-medium text-primary-700" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <p className="px-1 pt-3 pb-2 text-xs font-medium tracking-wide text-slate-500 uppercase">
              Personalizado
            </p>
            <div className="flex items-center gap-2 px-1">
              <DateField
                ariaLabel="Fecha desde"
                value={value.from}
                onChange={(from) => onChange({ ...value, from })}
                className="flex-1"
              />
              <span className="text-slate-300">–</span>
              <DateField
                ariaLabel="Fecha hasta"
                value={value.to}
                onChange={(to) => onChange({ ...value, to })}
                className="flex-1"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
