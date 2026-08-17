import { NextResponse } from "next/server";
import { readUploadLog } from "@/lib/upload-log";

export async function GET() {
  const log = await readUploadLog();
  const ordenado = [...log].sort((a, b) => b.generadoEn.localeCompare(a.generadoEn));
  return NextResponse.json({ cargas: ordenado });
}
