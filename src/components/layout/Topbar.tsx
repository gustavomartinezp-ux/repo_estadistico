"use client";

import { Menu } from "lucide-react";
import type { ReactNode } from "react";

interface TopbarProps {
  title: string;
  eyebrow?: string;
  onMenuClick: () => void;
  /** Contenido a la derecha (ej. el selector de fecha global del Dashboard). Opcional. */
  rightSlot?: ReactNode;
}

export function Topbar({
  title,
  eyebrow = "Dirección de Administración de Salud",
  onMenuClick,
  rightSlot,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-primary-500 via-accent-400 to-primary-500" />
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="shrink-0 cursor-pointer rounded-lg p-2 text-slate-500 transition-colors duration-200 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <p className="hidden text-xs font-medium tracking-wide text-primary-600 uppercase sm:block">
            {eyebrow}
          </p>
          <h1 className="truncate text-base font-semibold text-slate-800 sm:text-lg">{title}</h1>
        </div>
      </div>

      {rightSlot}
    </header>
  );
}
