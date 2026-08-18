import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { head, put } from "@vercel/blob";
import { useBlob } from "./blob-mode";
import type { EtlReport } from "./types";

/** Mismo patrón que data-store.ts: Vercel Blob en producción, disco en desarrollo local. */
const LOG_FILE = path.join(process.cwd(), "data", "upload-log.json");
const LOG_BLOB_PATHNAME = "upload-log.json";

export async function readUploadLog(): Promise<EtlReport[]> {
  try {
    if (useBlob) {
      // Ver el comentario en data-store.ts: el CDN puede servir una copia
      // vieja del blob público pese a {cache:"no-store"} — el etag como
      // query param fuerza un cache-miss cuando el contenido cambió.
      const info = await head(LOG_BLOB_PATHNAME);
      const res = await fetch(`${info.url}?v=${encodeURIComponent(info.etag)}`, { cache: "no-store" });
      if (!res.ok) return [];
      return (await res.json()) as EtlReport[];
    }
    return JSON.parse(readFileSync(LOG_FILE, "utf-8"));
  } catch {
    return [];
  }
}

export async function appendUploadLog(report: EtlReport): Promise<void> {
  const log = await readUploadLog();
  log.push(report);
  const json = JSON.stringify(log, null, 2);
  if (useBlob) {
    await put(LOG_BLOB_PATHNAME, json, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: "application/json",
      cacheControlMaxAge: 0,
    });
  } else {
    mkdirSync(path.dirname(LOG_FILE), { recursive: true });
    writeFileSync(LOG_FILE, json);
  }
}
