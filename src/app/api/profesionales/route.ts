import { NextResponse } from "next/server";
import { loadAggregatedData } from "@/lib/data-store";
import { esProfesionalReal } from "@/lib/profesionales";
import type { ProfesionalSummary } from "@/lib/types";

interface Acc {
  estamentos: Set<string>;
  establecimientos: Set<string>;
  prestaciones: Set<string>;
  total: number;
  atendidas: number;
}

export async function GET() {
  let profesionales: ProfesionalSummary[];
  try {
    const data = await loadAggregatedData();
    const map = new Map<string, Acc>();

    for (const r of data) {
      if (!esProfesionalReal(r.profesional)) continue;
      let acc = map.get(r.profesional);
      if (!acc) {
        acc = { estamentos: new Set(), establecimientos: new Set(), prestaciones: new Set(), total: 0, atendidas: 0 };
        map.set(r.profesional, acc);
      }
      acc.estamentos.add(r.estamento);
      acc.establecimientos.add(r.establecimiento);
      acc.prestaciones.add(r.prestacion);
      acc.total += r.cantidad;
      if (r.estado === "Atendido") acc.atendidas += r.cantidad;
    }

    profesionales = Array.from(map.entries())
      .map(([nombre, acc]) => ({
        nombre,
        estamento: Array.from(acc.estamentos).sort().join(", "),
        establecimientos: Array.from(acc.establecimientos).sort(),
        totalRegistros: acc.total,
        totalAtendidas: acc.atendidas,
        prestacionesDistintas: acc.prestaciones.size,
      }))
      .sort((a, b) => b.totalRegistros - a.totalRegistros);
  } catch (err) {
    console.error("[/api/profesionales]", err);
    return NextResponse.json({ error: "No se pudo leer el archivo de datos agregados." }, { status: 500 });
  }

  return NextResponse.json({ profesionales });
}
