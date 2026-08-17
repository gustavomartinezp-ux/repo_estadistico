"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  Building2,
  LayoutDashboard,
  Settings,
  Stethoscope,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMediaQuery } from "@/lib/use-media-query";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Cargar Informe", icon: UploadCloud, href: "/cargar" },
  { label: "Establecimientos", icon: Building2, href: "/establecimientos" },
  { label: "Profesionales", icon: Users, href: "/profesionales" },
  { label: "Prestaciones", icon: Stethoscope, href: "/prestaciones" },
  { label: "Reportes", icon: Activity, href: "/reportes" },
];

interface SidebarProps {
  /** En mobile/tablet el sidebar es un drawer oculto por defecto; en desktop (lg+) siempre está visible. */
  open: boolean;
  onClose: () => void;
}

/** Sidebar de navegación. */
export function Sidebar({ open, onClose }: SidebarProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const visible = isDesktop || open;
  const pathname = usePathname();

  return (
    <>
      <AnimatePresence>
        {!isDesktop && open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-30 bg-slate-900/40"
            onClick={onClose}
            aria-hidden
          />
        )}
      </AnimatePresence>

      <motion.aside
        animate={{ x: visible ? 0 : -240 }}
        transition={{ type: "spring", stiffness: 320, damping: 32 }}
        className="fixed inset-y-0 left-0 z-40 flex w-60 flex-col border-r border-slate-200 bg-white"
      >
        <div className="relative flex h-16 items-center gap-2.5 overflow-hidden border-b border-slate-100 px-5">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary-50 via-transparent to-transparent" />
          <Image
            src="/das-logo-mark.png"
            alt="DAS - Dirección de Administración de Salud"
            width={476}
            height={322}
            priority
            className="relative h-9 w-auto shrink-0"
          />
          <p className="relative text-xs font-medium text-slate-500">Red APS Talcahuano</p>
          <button
            type="button"
            onClick={onClose}
            className="relative ml-auto cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
            const active = href !== null && pathname === href;
            const itemClasses = `relative flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none ${
              active
                ? "cursor-pointer text-primary-700"
                : href
                  ? "cursor-pointer text-slate-600 hover:bg-slate-50"
                  : "cursor-not-allowed text-slate-400 hover:bg-slate-50"
            }`;

            if (href) {
              return (
                <Link key={label} href={href} onClick={onClose} className={itemClasses}>
                  {active && (
                    <motion.span
                      layoutId="sidebar-active-pill"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary-50 to-primary-100/70"
                    />
                  )}
                  {active && (
                    <span className="absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-full bg-gradient-to-b from-primary-500 to-accent-500" />
                  )}
                  <Icon className="relative h-4 w-4 shrink-0" />
                  <span className="relative">{label}</span>
                </Link>
              );
            }
            return (
              <button
                key={label}
                type="button"
                disabled
                title="Próximamente"
                className={itemClasses}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 px-3 py-4">
          <button
            type="button"
            disabled
            className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-all duration-200 hover:bg-slate-50"
          >
            <Settings className="h-4 w-4 shrink-0" />
            Configuración
          </button>
        </div>
      </motion.aside>
    </>
  );
}
