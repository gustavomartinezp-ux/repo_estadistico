"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { Footer } from "./Footer";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

interface AppShellProps {
  title: string;
  rightSlot?: ReactNode;
  children: ReactNode;
}

/** Sidebar + Topbar + contenedor de contenido, compartido por las páginas simples (no-Dashboard). */
export function AppShell({ title, rightSlot, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="das-ambient-bg" aria-hidden />
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-60">
        <Topbar title={title} onMenuClick={() => setSidebarOpen(true)} rightSlot={rightSlot} />
        <main className="relative z-10 mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
