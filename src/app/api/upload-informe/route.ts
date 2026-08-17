import { NextRequest, NextResponse } from "next/server";
import { readAggregatedFileRaw, writeAggregatedData } from "@/lib/data-store";
import { parseInformeBuffer } from "@/lib/etl";
import { appendUploadLog } from "@/lib/upload-log";

const MAX_SIZE_BYTES = 80 * 1024 * 1024; // 80MB

export async function POST(request: NextRequest) {
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
    return NextResponse.json(
      { error: `"${file.name}" no es un archivo .xlsx/.xls.` },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: `El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)}MB, el máximo es ${MAX_SIZE_BYTES / 1024 / 1024}MB.` },
      { status: 400 }
    );
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(await file.arrayBuffer());
  } catch {
    return NextResponse.json({ error: "No se pudo leer el contenido del archivo." }, { status: 400 });
  }

  let parsed: ReturnType<typeof parseInformeBuffer>;
  try {
    parsed = parseInformeBuffer(buffer, file.name);
  } catch (err) {
    console.error("[/api/upload-informe] error parseando xlsx:", err);
    return NextResponse.json(
      { error: "No se pudo leer el archivo como Excel. ¿Es un .xlsx válido?" },
      { status: 400 }
    );
  }

  const { aggregated, report } = parsed;

  if (report.establecimientosDetectados.length === 0) {
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

  return NextResponse.json({
    report,
    registrosReemplazados: existing.length - kept.length,
    totalRegistrosEnSistema: merged.reduce((sum, r) => sum + r.cantidad, 0),
  });
}
