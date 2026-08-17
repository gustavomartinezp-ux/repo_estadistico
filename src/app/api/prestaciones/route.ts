import { NextResponse } from "next/server";
import { loadAggregatedData } from "@/lib/data-store";
import { esProfesionalReal } from "@/lib/profesionales";
import type { PrestacionSummary } from "@/lib/types";

interface Acc {
  estamentos: Set<string>;
  profesionales: Set<string>;
  total: number;
  atendidas: number;
}

export async function GET() {
  let prestaciones: PrestacionSummary[];
  try {
    const data = await loadAggregatedData();
    const map = new Map<string, Acc>();

    for (const r of data) {
      let acc = map.get(r.prestacion);
      if (!acc) {
        acc = { estamentos: new Set(), profesionales: new Set(), total: 0, atendidas: 0 };
        map.set(r.prestacion, acc);
      }
      acc.estamentos.add(r.estamento);
      if (esProfesionalReal(r.profesional)) acc.profesionales.add(r.profesional);
      acc.total += r.cantidad;
      if (r.estado === "Atendido") acc.atendidas += r.cantidad;
    }

    prestaciones = Array.from(map.entries())
      .map(([nombre, acc]) => ({
        nombre,
        estamentos: Array.from(acc.estamentos).sort(),
        totalRegistros: acc.total,
        totalAtendidas: acc.atendidas,
        profesionalesDistintos: acc.profesionales.size,
      }))
      .sort((a, b) => b.totalRegistros - a.totalRegistros);
  } catch (err) {
    console.error("[/api/prestaciones]", err);
    return NextResponse.json({ error: "No se pudo leer el archivo de datos agregados." }, { status: 500 });
  }

  return NextResponse.json({ prestaciones });
}
