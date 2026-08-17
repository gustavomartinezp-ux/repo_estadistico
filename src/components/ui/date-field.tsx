"use client";

import { Calendar } from "lucide-react";

interface DateFieldProps {
  value: string | null;
  onChange: (value: string | null) => void;
  ariaLabel: string;
  className?: string;
}

/**
 * <input type="date"> con ícono propio: el ícono nativo del navegador no
 * queda anclado de forma consistente entre un campo vacío y uno con valor
 * (ver .date-input--icon-hidden en globals.css), así que lo ocultamos y
 * clicable en todo el ancho, y dibujamos un ícono de Lucide fijo encima.
 */
export function DateField({ value, onChange, ariaLabel, className = "" }: DateFieldProps) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <input
        type="date"
        aria-label={ariaLabel}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="date-input--icon-hidden h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pr-8 pl-3 text-sm text-slate-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
      />
      <Calendar className="pointer-events-none absolute top-1/2 right-2.5 h-4 w-4 -translate-y-1/2 text-slate-500" />
    </div>
  );
}
