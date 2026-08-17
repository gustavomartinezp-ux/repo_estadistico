import { NextResponse } from "next/server";
import { loadAggregatedData } from "@/lib/data-store";
import { getRedDeEstablecimiento, REDES } from "@/lib/establecimientos";
import { esProfesionalReal } from "@/lib/profesionales";
import type { EstablecimientoSummary } from "@/lib/types";

export async function GET() {
  let summaries: EstablecimientoSummary[];
  try {
    const data = await loadAggregatedData();
    const nombres = REDES.flatMap((r) => [r.cesfam, ...r.dependencias]);
    const cabeceras = new Set(REDES.map((r) => r.cesfam));

    summaries = nombres.map((nombre) => {
      const rows = data.filter((r) => r.establecimiento === nombre);
      let desde: string | null = null;
      let hasta: string | null = null;
      for (const r of rows) {
        if (!desde || r.fechaISO < desde) desde = r.fechaISO;
        if (!hasta || r.fechaISO > hasta) hasta = r.fechaISO;
      }
      return {
        nombre,
        red: getRedDeEstablecimiento(nombre) ?? nombre,
        esCabecera: cabeceras.has(nombre),
        totalRegistros: rows.reduce((s, r) => s + r.cantidad, 0),
        totalAtendidas: rows
          .filter((r) => r.estado === "Atendido")
          .reduce((s, r) => s + r.cantidad, 0),
        profesionalesActivos: new Set(rows.map((r) => r.profesional).filter(esProfesionalReal)).size,
        prestacionesDistintas: new Set(rows.map((r) => r.prestacion)).size,
        rangoFechas: { desde, hasta },
      };
    });
  } catch (err) {
    console.error("[/api/establecimientos]", err);
    return NextResponse.json({ error: "No se pudo leer el archivo de datos agregados." }, { status: 500 });
  }

  return NextResponse.json({ establecimientos: summaries });
}
