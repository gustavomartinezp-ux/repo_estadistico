import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { useBlob } from "./blob-mode";
import { readBlobJsonCompressed, writeBlobJsonCompressed } from "./blob-json";
import type { EtlReport } from "./types";

/** Mismo patrón que data-store.ts: Vercel Blob (comprimido) en producción, disco en desarrollo local. */
const LOG_FILE = path.join(process.cwd(), "data", "upload-log.json");
const LOG_BLOB_PATHNAME = "upload-log.json";

export async function readUploadLog(): Promise<EtlReport[]> {
  try {
    if (useBlob) {
      return (await readBlobJsonCompressed<EtlReport[]>(LOG_BLOB_PATHNAME)) ?? [];
    }
    return JSON.parse(readFileSync(LOG_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export async function appendUploadLog(report: EtlReport): Promise<void> {
  const log = await readUploadLog();
  log.push(report);
  if (useBlob) {
    await writeBlobJsonCompressed(LOG_BLOB_PATHNAME, log);
  } else {
    mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  }
}
