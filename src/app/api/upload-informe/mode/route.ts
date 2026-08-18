import { NextResponse } from "next/server";
import { useBlob } from "@/lib/blob-mode";

/**
 * Le dice al cliente qué mecanismo de subida usar: en Vercel, las Serverless
 * Functions rechazan cualquier body de más de 4.5MB antes de que nuestro
 * código corra (los informes reales pesan bastante más), así que ahí el
 * navegador debe subir el archivo directo a Vercel Blob y solo mandarnos la
 * URL. En desarrollo local ese límite no existe, así que se sigue subiendo
 * directo a la función (multipart clásico), sin necesitar credenciales de
 * la nube.
 */
export async function GET() {
  return NextResponse.json({ useBlob });
}
