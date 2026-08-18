import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { useBlob } from "./blob-mode";
import { readBlobJsonCompressed, writeBlobJsonCompressed } from "./blob-json";
import type { AtencionesResponse } from "./types";

/**
 * La respuesta de /api/atenciones sin ningún filtro ("Todos") es la carga
 * inicial del Dashboard — el caso más común, con gran diferencia. En vez de
 * recalcularla en cada visita releyendo y filtrando el agregado completo
 * (cientos de miles de registros), se precalcula una vez por carga de
 * informe y se sirve directo: pasa de un cómputo sobre todo el dataset a
 * leer un JSON de unos pocos KB.
 */
const SUMMARY_FILE = path.join(process.cwd(), "data", "atenciones-summary.json");
const SUMMARY_BLOB_PATHNAME = "atenciones-summary.json";

export async function readAtencionesSummary(): Promise<AtencionesResponse | null> {
  try {
    if (useBlob) {
      return await readBlobJsonCompressed<AtencionesResponse>(SUMMARY_BLOB_PATHNAME);
    }
    return JSON.parse(readFileSync(SUMMARY_FILE, "utf-8"));
  } catch {
    return null;
  }
}

export async function writeAtencionesSummary(summary: AtencionesResponse): Promise<void> {
  if (useBlob) {
    await writeBlobJsonCompressed(SUMMARY_BLOB_PATHNAME, summary);
  } else {
    mkdirSync(path.dirname(SUMMARY_FILE), { recursive: true });
    writeFileSync(SUMMARY_FILE, JSON.stringify(summary));
  }
}
