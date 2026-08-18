import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

const MAX_SIZE_BYTES = 80 * 1024 * 1024; // 80MB

/**
 * Emite el token que autoriza al navegador a subir el archivo directo a
 * Vercel Blob (sin pasar por nuestra función, que en Vercel rechaza
 * cualquier body de más de 4.5MB). Solo llega hasta acá quien ya pasó el
 * gate de sesión en middleware.ts (mismo matcher que /api/upload-informe).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!/\.xlsx?$/i.test(pathname)) {
          throw new Error(`"${pathname}" no es un archivo .xlsx/.xls.`);
        }
        return {
          addRandomSuffix: true,
          maximumSizeInBytes: MAX_SIZE_BYTES,
        };
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "No se pudo autorizar la subida." },
      { status: 400 }
    );
  }
}
