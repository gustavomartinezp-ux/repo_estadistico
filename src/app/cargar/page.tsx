"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  LogOut,
  UploadCloud,
  X,
} from "lucide-react";
import { upload } from "@vercel/blob/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Footer } from "@/components/layout/Footer";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { Card } from "@/components/ui/card";
import type { EtlReport } from "@/lib/types";

interface UploadResult {
  report: EtlReport;
  registrosReemplazados: number;
  totalRegistrosEnSistema: number;
}

type Status = "idle" | "uploading" | "success" | "error";

function formatFecha(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

function formatSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function CargarInformePage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  // Vercel rechaza cualquier body de más de 4.5MB antes de que nuestra
  // función corra, así que ahí hay que subir directo a Blob desde el
  // navegador. En desarrollo local (sin ese límite) se sube clásico. Empieza
  // en `false` (modo clásico) para no bloquear la UI mientras se confirma.
  const [useBlobMode, setUseBlobMode] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/upload-informe/mode")
      .then((res) => res.json())
      .then((data: { useBlob: boolean }) => setUseBlobMode(data.useBlob))
      .catch(() => {
        // silencioso: si falla, se sigue usando el modo clásico por defecto
      });
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const pickFile = useCallback((f: File | null) => {
    setResult(null);
    setErrorMessage(null);
    setStatus("idle");
    if (!f) {
      setFile(null);
      return;
    }
    if (!/\.xlsx?$/i.test(f.name)) {
      setErrorMessage(`"${f.name}" no es un archivo .xlsx/.xls.`);
      setFile(null);
      return;
    }
    setFile(f);
  }, []);

  async function handleUpload() {
    if (!file) return;
    setStatus("uploading");
    setErrorMessage(null);
    setUploadProgress(null);

    try {
      let res: Response;
      if (useBlobMode) {
        // Sube directo del navegador a Vercel Blob (evita el límite de
        // 4.5MB del body de las Serverless Functions) y luego le pasa a
        // nuestra función solo la URL del archivo temporal para procesarlo.
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/upload-informe/client-token",
          onUploadProgress: ({ percentage }) => setUploadProgress(percentage),
        });
        setUploadProgress(null);
        res = await fetch("/api/upload-informe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: blob.url, filename: file.name }),
        });
      } else {
        const formData = new FormData();
        formData.append("file", file);
        res = await fetch("/api/upload-informe", { method: "POST", body: formData });
      }

      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? `El servidor respondió ${res.status}.`);
      }
      setResult(body as UploadResult);
      setStatus("success");
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error desconocido al subir el archivo.");
      setStatus("error");
    } finally {
      setUploadProgress(null);
    }
  }

  const hasCorrupted = result && Object.keys(result.report.etiquetasCorruptasDetectadas).length > 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-60">
        <Topbar
          title="Cargar Informe"
          onMenuClick={() => setSidebarOpen(true)}
          rightSlot={
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 shadow-sm transition-all duration-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loggingOut ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
              Cerrar sesión
            </button>
          }
        />

        <main className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
          <div>
            <h2 className="text-sm font-semibold text-slate-800">Informe estadístico de producción</h2>
            <p className="mt-1 text-sm text-slate-500">
              Sube el Excel exportado del sistema clínico para un establecimiento (CESFAM, CECOSF o
              Posta). Se procesa en el servidor: nunca se envían al navegador datos de pacientes, solo
              conteos agregados por día/estamento/profesional/prestación.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Si ya había datos de ese establecimiento para las mismas fechas que cubre este archivo,
              se reemplazan (para no duplicar). Las fechas fuera de ese rango no se tocan — puedes subir
              un mes a la vez sin perder los meses anteriores.
            </p>
          </div>

          <Card>
            {!file ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  pickFile(e.dataTransfer.files[0] ?? null);
                }}
                onClick={() => inputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors duration-200 ${
                  dragging ? "border-primary-400 bg-primary-50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <UploadCloud className="h-9 w-9 text-slate-500" />
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Arrastra el archivo aquí o haz click para elegirlo
                  </p>
                  <p className="mt-1 text-xs text-slate-500">.xlsx o .xls, hasta 80MB</p>
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <FileSpreadsheet className="h-8 w-8 shrink-0 text-primary-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500">{formatSize(file.size)}</p>
                </div>
                {status !== "uploading" && (
                  <button
                    type="button"
                    onClick={() => pickFile(null)}
                    className="cursor-pointer rounded-lg p-1.5 text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {file && status !== "success" && (
              <button
                type="button"
                onClick={handleUpload}
                disabled={status === "uploading"}
                className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "uploading" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {uploadProgress !== null
                      ? `Subiendo… ${Math.round(uploadProgress)}%`
                      : "Procesando… puede tardar hasta un minuto en archivos grandes"}
                  </>
                ) : (
                  "Subir y procesar"
                )}
              </button>
            )}

            <AnimatePresence>
              {status === "error" && errorMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{errorMessage}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>

          <AnimatePresence>
            {status === "success" && result && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Card>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="h-5 w-5 text-teal-600" />
                    <h3 className="text-sm font-semibold text-slate-800">Procesado correctamente</h3>
                  </div>

                  <p className="mt-2 text-sm text-slate-600">
                    Establecimiento{result.report.establecimientosDetectados.length > 1 ? "s" : ""}:{" "}
                    <span className="font-medium text-slate-800">
                      {result.report.establecimientosDetectados.join(", ")}
                    </span>
                  </p>

                  {result.registrosReemplazados > 0 && (
                    <p className="mt-1 text-xs text-slate-500">
                      Se reemplazaron {result.registrosReemplazados.toLocaleString("es-CL")} grupos que
                      ya existían para ese rango de fechas ({formatFecha(result.report.rangoFechas.desde)}{" "}
                      – {formatFecha(result.report.rangoFechas.hasta)}). Los datos fuera de ese rango no
                      se tocaron.
                    </p>
                  )}

                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                      <p className="text-xs text-slate-500">Filas leídas</p>
                      <p className="text-lg font-bold tabular-nums text-slate-800">
                        {result.report.filasLeidas.toLocaleString("es-CL")}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                      <p className="text-xs text-slate-500">Agregadas</p>
                      <p className="text-lg font-bold tabular-nums text-slate-800">
                        {result.report.filasValidasAgregadas.toLocaleString("es-CL")}
                      </p>
                    </div>
                    {result.report.filasReparadas > 0 && (
                      <div className="rounded-lg bg-teal-50 px-3 py-2.5">
                        <p className="text-xs text-teal-700">Reparadas</p>
                        <p className="text-lg font-bold tabular-nums text-teal-800">
                          {result.report.filasReparadas.toLocaleString("es-CL")}
                        </p>
                      </div>
                    )}
                    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                      <p className="text-xs text-slate-500">Descartadas</p>
                      <p className="text-lg font-bold tabular-nums text-slate-800">
                        {(
                          result.report.filasDescartadasPorCorrupcion +
                          result.report.filasDescartadasPorCamposFaltantes
                        ).toLocaleString("es-CL")}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                      <p className="text-xs text-slate-500">Total en sistema</p>
                      <p className="text-lg font-bold tabular-nums text-slate-800">
                        {result.totalRegistrosEnSistema.toLocaleString("es-CL")}
                      </p>
                    </div>
                  </div>

                  <p className="mt-4 text-xs text-slate-500">
                    Rango de fechas: {formatFecha(result.report.rangoFechas.desde)} –{" "}
                    {formatFecha(result.report.rangoFechas.hasta)}
                  </p>

                  {hasCorrupted && (
                    <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-800">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <p>
                        {result.report.filasDescartadasPorCorrupcion.toLocaleString("es-CL")} filas se
                        descartaron por datos corruptos que no se pudieron reparar automáticamente
                        (desplazamiento de columnas más profundo que el habitual) — no están reflejadas
                        en el dashboard.
                      </p>
                    </div>
                  )}

                  <div className="mt-5 flex gap-2">
                    <Link
                      href="/"
                      className="flex-1 rounded-lg bg-primary-600 px-4 py-2.5 text-center text-sm font-medium text-white shadow-sm transition-all duration-200 hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none"
                    >
                      Ir al Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={() => pickFile(null)}
                      className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-all duration-200 hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:outline-none"
                    >
                      Cargar otro
                    </button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    </div>
  );
}
