import { Code2 } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="h-px bg-gradient-to-r from-primary-600 via-primary-300 to-transparent" />
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-5 sm:flex-row sm:px-6">
        <p className="text-xs text-slate-500">
          © {year} Dirección de Administración de Salud · Red APS Talcahuano
        </p>
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <Code2 className="h-3.5 w-3.5 text-primary-500" />
          Desarrollado por <span className="font-semibold text-slate-700">Ing. Gustavo Martínez Parra</span>
        </p>
      </div>
    </footer>
  );
}
