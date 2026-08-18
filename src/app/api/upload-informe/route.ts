import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { readAggregatedFileRaw, writeAggregatedData } from "@/lib/data-store";
import { parseInformeBuffer } from "@/lib/etl";
import { appendUploadLog } from "@/lib/upload-log";

const MAX_SIZE_BYTES = 80 * 1024 * 1024; // 80MB

/**
 * Dos modos de entrada, según cómo llegó el archivo al servidor:
 *
 * - JSON `{ url, filename }`: el navegador ya subió el archivo directo a
 *   Vercel Blob (ver /api/upload-informe/client-token) — acá solo bajamos
 *   ese archivo temporal para parsearlo, y lo borramos al terminar (nunca
 *   debe persistir el Excel crudo con datos de pacientes). Es el único modo
 *   viable en Vercel: las Serverless Functions rechazan cualquier body de
 *   más de 4.5MB antes de que este código llegue a correr.
 * - multipart/form-data con campo "file": subida clásica directa a la
 *   función. Solo se usa en desarrollo local, donde ese límite no existe.
 */
export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  let filename: string;
  let buffer: Buffer;
  let tempBlobUrl: string | null = null;

  if (contentType.includes("application/json")) {
    let body: { url?: string; filename?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "No se pudo leer la solicitud." }, { status: 400 });
    }

    if (!body.url || !body.filename) {
      return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
    }
    filename = body.filename;
    tempBlobUrl = body.url;

    if (!/\.xlsx?$/i.test(filename)) {
      await del(tempBlobUrl).catch(() => {});
      return NextResponse.json({ error: `"${filename}" no es un archivo .xlsx/.xls.` }, { status: 400 });
    }

    try {
      const res = await fetch(tempBlobUrl);
      if (!res.ok) throw new Error(`descarga del blob respondió ${res.status}`);
      const arrayBuffer = await res.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
        await del(tempBlobUrl).catch(() => {});
        return NextResponse.json(
          {
            error: `El archivo pesa ${(arrayBuffer.byteLength / 1024 / 1024).toFixed(1)}MB, el máximo es ${MAX_SIZE_BYTES / 1024 / 1024}MB.`,
          },
          { status: 400 }
        );
      }
      buffer = Buffer.from(arrayBuffer);
    } catch (err) {
      console.error("[/api/upload-informe] error descargando el blob temporal:", err);
      return NextResponse.json({ error: "No se pudo leer el archivo subido." }, { status: 400 });
    }
  } else {
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (err) {
      console.error("[/api/upload-informe] error leyendo el body multipart:", err);
      return NextResponse.json({ error: "No se pudo leer el archivo enviado." }, { status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
    }
    if (!/\.xlsx?$/i.test(file.name)) {
      return NextResponse.json({ error: `"${file.name}" no es un archivo .xlsx/.xls.` }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)}MB, el máximo es ${MAX_SIZE_BYTES / 1024 / 1024}MB.` },
        { status: 400 }
      );
    }
    filename = file.name;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
    } catch {
      return NextResponse.json({ error: "No se pudo leer el contenido del archivo." }, { status: 400 });
    }
  }

  let parsed: ReturnType<typeof parseInformeBuffer>;
  try {
    parsed = parseInformeBuffer(buffer, filename);
  } catch (err) {
    console.error("[/api/upload-informe] error parseando xlsx:", err);
    if (tempBlobUrl) await del(tempBlobUrl).catch(() => {});
    return NextResponse.json(
      { error: "No se pudo leer el archivo como Excel. ¿Es un .xlsx válido?" },
      { status: 400 }
    );
  }

  const { aggregated, report } = parsed;

  if (report.establecimientosDetectados.length === 0) {
    if (tempBlobUrl) await del(tempBlobUrl).catch(() => {});
    return NextResponse.json(
      { error: "No se detectaron filas válidas en el archivo (revisa que tenga las columnas esperadas: FechaCita, TipoProfesional, Profesional, Prestacion, EstadoCita)." },
      { status: 400 }
    );
  }

  // Reemplaza SOLO lo que se solapa: mismo establecimiento Y misma fecha
  // dentro del rango que cubre este archivo. Así, subir "Los Cerros agosto
  // 2026" no borra enero 2025-julio 2026 (que están fuera de ese rango) —
  // solo pisa agosto si ya existía, y agrega el resto sin tocar el resto.
  const detected = new Set(report.establecimientosDetectados);
  const { desde, hasta } = report.rangoFechas;
  const existing = await readAggregatedFileRaw();
  const kept = existing.filter((r) => {
    if (!detected.has(r.establecimiento)) return true;
    if (desde && r.fecha < desde) return true;
    if (hasta && r.fecha > hasta) return true;
    return false;
  });
  const merged = [...kept, ...aggregated].sort((a, b) => a.fecha.localeCompare(b.fecha));

  await writeAggregatedData(merged);
  await appendUploadLog(report);
  if (tempBlobUrl) {
    await del(tempBlobUrl).catch((err) =>
      console.error("[/api/upload-informe] no se pudo borrar el blob temporal:", err)
    );
  }

  return NextResponse.json({
    report,
    registrosReemplazados: existing.length - kept.length,
    totalRegistrosEnSistema: merged.reduce((sum, r) => sum + r.cantidad, 0),
  });
}
