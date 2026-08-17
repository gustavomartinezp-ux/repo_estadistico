import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { head, put } from "@vercel/blob";
import type { AggregatedRecord, StatRecord } from "./types";

/**
 * En Vercel el filesystem es efímero (se resetea entre despliegues y no se
 * comparte entre invocaciones de funciones serverless), así que el agregado
 * vive en Vercel Blob cuando hay un token configurado. En desarrollo local
 * (sin BLOB_READ_WRITE_TOKEN) sigue usando el disco, sin necesitar
 * credenciales de la nube para levantar el proyecto.
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

const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

function toStatRecords(raw: AggregatedRecord[]): StatRecord[] {
  return raw.map((r) => ({
    ...r,
    fecha: new Date(r.fecha),
    fechaISO: r.fecha,
  }));
}

async function readRawFromBlob(): Promise<AggregatedRecord[]> {
  try {
    const info = await head(BLOB_PATHNAME);
    const res = await fetch(info.url, { cache: "no-store" });
    if (!res.ok) return [];
    return (await res.json()) as AggregatedRecord[];
  } catch {
    // El blob todavía no existe (primera carga) u otro error de red: se
    // trata igual que "sin datos aún", igual que el catch del disco local.
    return [];
  }
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
  const raw = useBlob ? await readRawFromBlob() : readRawFromDisk();
  cachedData = toStatRecords(raw);
  return cachedData;
}

/** Lee el archivo/blob crudo sin pasar por la caché (usado antes de fusionar una carga nueva). */
export async function readAggregatedFileRaw(): Promise<AggregatedRecord[]> {
  return useBlob ? readRawFromBlob() : readRawFromDisk();
}

export async function writeAggregatedData(records: AggregatedRecord[]): Promise<void> {
  const json = JSON.stringify(records);
  if (useBlob) {
    await put(BLOB_PATHNAME, json, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
    });
  } else {
    mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    writeFileSync(DATA_FILE, json);
  }
  cachedData = toStatRecords(records);
}
