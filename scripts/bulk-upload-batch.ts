/**
 * Procesa VARIOS informes en una sola pasada en memoria y escribe a Vercel
 * Blob UNA SOLA VEZ al final. Existe porque un read-modify-write por archivo
 * resultó inseguro: Vercel Blob es de consistencia eventual al sobrescribir
 * un blob existente, y una escritura ya confirmada puede de todos modos ser
 * pisada más tarde por otra escritura que leyó una copia vieja antes de que
 * la primera terminara de propagar. Al hacer un solo read -> N merges en
 * memoria -> un solo write, el problema desaparece por construcción (no hay
 * lecturas intermedias que puedan quedar obsoletas).
 *
 * Usa los mismos helpers (blob-json.ts) que la app en producción, así que
 * el formato (comprimido) y las garantías de propagación son idénticos.
 *
 * Uso:
 *   BLOB_READ_WRITE_TOKEN=<token> npx tsx scripts/bulk-upload-batch.ts <archivo1.xlsx> <archivo2.xlsx> ...
 */
import { readFileSync } from "node:fs";
import { readBlobJsonCompressed, writeBlobJsonCompressed } from "../src/lib/blob-json";
import { parseInformeBuffer } from "../src/lib/etl";
import type { AggregatedRecord, EtlReport } from "../src/lib/types";

const filePaths = process.argv.slice(2);
if (filePaths.length === 0) {
  console.error("Uso: tsx scripts/bulk-upload-batch.ts <archivo1.xlsx> <archivo2.xlsx> ...");
  process.exit(1);
}
if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("Falta BLOB_READ_WRITE_TOKEN en el entorno.");
  process.exit(1);
}

async function main() {
  console.log("Bajando el agregado actual de producción (única lectura de toda la corrida)...");
  let accumulator: AggregatedRecord[] = (await readBlobJsonCompressed<AggregatedRecord[]>("atenciones.json")) ?? [];
  const newLogEntries: EtlReport[] = [];

  for (const filePath of filePaths) {
    const buffer = readFileSync(filePath);
    const filename = filePath.split(/[\\/]/).pop()!;
    console.log(`\nParseando ${filename} (${(buffer.length / 1024 / 1024).toFixed(1)}MB)...`);

    const { aggregated, report } = parseInformeBuffer(buffer, filename);
    if (report.establecimientosDetectados.length === 0) {
      console.error(`  SIN FILAS VÁLIDAS, se omite: ${filename}`);
      continue;
    }

    const detected = new Set(report.establecimientosDetectados);
    const { desde, hasta } = report.rangoFechas;
    const before = accumulator.length;
    const kept = accumulator.filter((r) => {
      if (!detected.has(r.establecimiento)) return true;
      if (desde && r.fecha < desde) return true;
      if (hasta && r.fecha > hasta) return true;
      return false;
    });
    accumulator = [...kept, ...aggregated];
    newLogEntries.push(report);

    console.log(
      `  ${report.establecimientosDetectados.join(", ")} | leidas: ${report.filasLeidas} | reparadas: ${report.filasReparadas} | agregadas: ${report.filasValidasAgregadas} | descartadas: ${report.filasDescartadasPorCorrupcion + report.filasDescartadasPorCamposFaltantes} | reemplazados: ${before - kept.length} | rango: ${desde}..${hasta}`
    );
  }

  accumulator.sort((a, b) => a.fecha.localeCompare(b.fecha));

  console.log("\nSubiendo el agregado final (una sola escritura, verificando propagación)...");
  await writeBlobJsonCompressed("atenciones.json", accumulator);

  const existingLog = (await readBlobJsonCompressed<EtlReport[]>("upload-log.json")) ?? [];
  const finalLog = [...existingLog, ...newLogEntries];
  await writeBlobJsonCompressed("upload-log.json", finalLog);

  const totales: Record<string, number> = {};
  for (const r of accumulator) totales[r.establecimiento] = (totales[r.establecimiento] ?? 0) + r.cantidad;

  console.log("\n=== Resultado final ===");
  console.log("grupos totales:", accumulator.length);
  console.log("registros totales:", accumulator.reduce((s, r) => s + r.cantidad, 0));
  for (const [k, v] of Object.entries(totales).sort()) console.log(" ", k, "->", v);
}

main().catch((err) => {
  console.error("ERROR:", err);
  process.exit(1);
});
