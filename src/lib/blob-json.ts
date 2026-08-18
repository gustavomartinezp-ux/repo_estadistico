import { gunzipSync, gzipSync } from "node:zlib";
import { head, put } from "@vercel/blob";

/**
 * El agregado llega a pesar cientos de MB en JSON plano (los mismos nombres
 * de establecimiento/prestación/profesional se repiten miles de veces) —
 * guardarlo comprimido corta drásticamente el tiempo de red en cada lectura
 * (~80-90% menos bytes). Tolera blobs viejos sin comprimir (intenta gunzip;
 * si no es gzip, parsea el texto tal cual) para no romper durante la
 * migración a este formato.
 *
 * El etag como query param evita que el CDN sirva una copia vieja del blob
 * pese a {cache:"no-store"} (eso solo controla la caché del cliente, no la
 * del CDN) — los blobs públicos se sirven con cache-control de 30 días.
 */
export async function readBlobJsonCompressed<T>(pathname: string): Promise<T | null> {
  try {
    const info = await head(pathname);
    const res = await fetch(`${info.url}?v=${encodeURIComponent(info.etag)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    let text: string;
    try {
      text = gunzipSync(buf).toString("utf-8");
    } catch {
      text = buf.toString("utf-8");
    }
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function writeBlobJsonCompressed(pathname: string, data: unknown): Promise<void> {
  const json = JSON.stringify(data);
  const compressed = gzipSync(json);
  const result = await put(pathname, compressed, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/octet-stream",
    cacheControlMaxAge: 0,
  });

  // Sobrescribir un blob existente en Vercel Blob es de consistencia
  // eventual — head() puede seguir devolviendo el etag viejo por varios
  // segundos después de un put() exitoso. No se vuelve hasta confirmarlo,
  // para que quien llame pueda confiar en que una lectura posterior ya ve
  // este contenido.
  for (let i = 0; i < 12; i++) {
    const info = await head(pathname).catch(() => null);
    if (info?.etag === result.etag) return;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`${pathname}: head() no reflejó el nuevo etag tras la escritura.`);
}
