import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { writeAtencionesSummary } from "./atenciones-summary";
import { useBlob } from "./blob-mode";
import { readBlobJsonCompressed, writeBlobJsonCompressed } from "./blob-json";
import { buildAtencionesResponse, EMPTY_FILTERS } from "./filter-utils";
import type { AggregatedRecord, StatRecord } from "./types";

/**
 * En Vercel el filesystem es efímero (se resetea entre despliegues y no se
 * comparte entre invocaciones de funciones serverless), así que el agregado
 * vive en Vercel Blob (comprimido, ver blob-json.ts) cuando hay un token
 * configurado. En desarrollo local (sin BLOB_READ_WRITE_TOKEN) sigue usando
 * el disco, sin necesitar credenciales de la nube para levantar el proyecto.
 *
 * El nombre del blob es fijo ("atenciones.json", sin sufijo aleatorio) y se
 * sobrescribe en cada carga — es un solo documento, no versionado.
 *
 * El agregado se mantiene en memoria por invocación de función: /api/atenciones
 * lo lee; /api/upload-informe lo actualiza (writeAggregatedData refresca la
 * caché) para que el próximo request en el mismo proceso vea los datos
 * nuevos sin esperar un cold start.
 */
let cachedData: StatRecord[] | null = null;

const DATA_FILE = path.join(process.cwd(), "data", "atenciones.json");
const BLOB_PATHNAME = "atenciones.json";

function toStatRecords(raw: AggregatedRecord[]): StatRecord[] {
  return raw.map((r) => ({
    ...r,
    fecha: new Date(r.fecha),
    fechaISO: r.fecha,
  }));
}

function readRawFromDisk(): AggregatedRecord[] {
  try {
    return JSON.parse(readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export async function loadAggregatedData(): Promise<StatRecord[]> {
  if (cachedData) return cachedData;
  const raw = useBlob
    ? ((await readBlobJsonCompressed<AggregatedRecord[]>(BLOB_PATHNAME)) ?? [])
    : readRawFromDisk();
  cachedData = toStatRecords(raw);
  return cachedData;
}

/** Lee el archivo/blob crudo sin pasar por la caché (usado antes de fusionar una carga nueva). */
export async function readAggregatedFileRaw(): Promise<AggregatedRecord[]> {
  if (useBlob) {
    return (await readBlobJsonCompressed<AggregatedRecord[]>(BLOB_PATHNAME)) ?? [];
  }
  return readRawFromDisk();
}

export async function writeAggregatedData(records: AggregatedRecord[]): Promise<void> {
  if (useBlob) {
    await writeBlobJsonCompressed(BLOB_PATHNAME, records);
  } else {
    const json = JSON.stringify(records);
    mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    writeFileSync(DATA_FILE, json);
  }
  const stats = toStatRecords(records);
  cachedData = stats;

  // Precalcula la respuesta "sin filtros" (la carga inicial del Dashboard)
  // acá mismo, para que nunca quede desincronizada del agregado real. Si
  // falla, no debe tumbar la carga del informe — el Dashboard simplemente
  // vuelve a calcular en vivo hasta la próxima carga exitosa.
  try {
    await writeAtencionesSummary(buildAtencionesResponse(stats, EMPTY_FILTERS));
  } catch (err) {
    console.error("[data-store] no se pudo precalcular el resumen de /api/atenciones:", err);
  }
}
