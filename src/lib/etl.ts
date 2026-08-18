import * as XLSX from "xlsx";
import { ESTAMENTOS_CONOCIDOS } from "./estamentos";
import { TODOS_LOS_ESTABLECIMIENTOS } from "./establecimientos";
import type { AggregatedRecord, EtlReport } from "./types";

/**
 * Cualquier fila cuyo "TipoProfesional" no calce con ESTAMENTOS_CONOCIDOS y
 * no se pueda reparar (ver repararDesplazamiento más abajo) se descarta.
 * Debe mantenerse igual a la lista en scripts/etl-los-cerros.mjs.
 */
const VALID_ESTAMENTOS = new Set<string>(ESTAMENTOS_CONOCIDOS);

const RUT_PATTERN = /^\d{6,9}-[\dkK]$/;

function pareceRut(valor: unknown): boolean {
  return typeof valor === "string" && RUT_PATTERN.test(valor.trim());
}

/**
 * Cuando el nombre de un profesional trae una coma en el sistema origen
 * (ej. "Muñoz Araneda, Alvaro"), el export a Excel lo parte en dos celdas —
 * "Profesional" se queda solo con "Alvaro" y el apellido "Muñoz Araneda" cae
 * en "TipoProfesional", desplazando en +1 TODAS las columnas siguientes de
 * esa fila (verificado celda por celda contra el archivo real de Los Cerros:
 * Especialidad→estamento real, TipoContrato→especialidad real,
 * TipoAtencion→CodigoPrestacion, CodigoPrestacion→Prestacion real,
 * Prestacion→VistoPor, FechaCita→HoraCita, HoraCita→EstadoCita,
 * EstadoCita→CitaConfirmada, MotivoNoAtendido→MotivoSobrecupo).
 *
 * Se detecta (sin adivinar) porque la columna "Especialidad" de esa misma
 * fila SÍ calza con un estamento válido — es el valor real de
 * TipoProfesional, corrido un lugar a la derecha. Si "Profesional" parece un
 * RUT en vez de un nombre, es un desplazamiento distinto (más profundo, que
 * arrastra también Establecimiento) y NO se repara: se prefiere descartar la
 * fila antes que arriesgar mal-atribuir el establecimiento.
 */
function repararDesplazamiento(row: Record<string, unknown>): Record<string, unknown> | null {
  const especialidad = row.Especialidad as string | null;
  const profesional = row.Profesional;
  const tipoProfesional = row.TipoProfesional as string | null;
  if (
    especialidad == null ||
    !VALID_ESTAMENTOS.has(especialidad) ||
    typeof profesional !== "string" ||
    pareceRut(profesional) ||
    tipoProfesional == null
  ) {
    return null;
  }

  return {
    ...row,
    Profesional: `${profesional} ${tipoProfesional}`.trim().replace(/\s+/g, " "),
    TipoProfesional: especialidad,
    TipoAtencion: row.CodigoPrestacion,
    Prestacion: row.VistoPor,
    FechaCita: row.HoraCita,
    EstadoCita: row.CitaConfirmada,
    MotivoNoAtendido: row.MotivoSobrecupo,
  };
}

/**
 * El sistema clínico origen no siempre exporta el nombre del establecimiento
 * igual a nuestra lista canónica (ej. "CECOF Esmeralda" en vez de "CECOSF
 * Esmeralda") — sin esto, esas filas quedan huérfanas: se cuentan en el total
 * general pero no calzan con ningún filtro ni aparecen en /establecimientos.
 * Se normaliza por variantes conocidas de sigla, ignorando tildes/mayúsculas.
 */
const ACENTOS: Record<string, string> = { Á: "A", É: "E", Í: "I", Ó: "O", Ú: "U", Ñ: "N" };

function establecimientoLooseKey(nombre: string): string {
  return nombre
    .trim()
    .toUpperCase()
    .replace(/[ÁÉÍÓÚÑ]/g, (c) => ACENTOS[c])
    .replace(/\bCECOSF\b/g, "CECOF")
    .replace(/\s+/g, " ");
}

const ESTABLECIMIENTO_CANONICO = new Map<string, string>(
  TODOS_LOS_ESTABLECIMIENTOS.map((nombre) => [establecimientoLooseKey(nombre), nombre])
);

function normalizarEstablecimiento(raw: string): string {
  const limpio = raw.trim().replace(/\s+/g, " ");
  const key = establecimientoLooseKey(limpio);

  const exacto = ESTABLECIMIENTO_CANONICO.get(key);
  if (exacto) return exacto;

  // El sistema origen a veces exporta el nombre oficial completo, con
  // palabras extra pegadas antes, en medio o después del nombre corto que
  // usamos en REDES (ej. "CESFAM Paulina Avendaño Pereda", "CESFAM Alcalde
  // Leocán Portus"). Si TODAS las palabras distintivas del nombre canónico
  // (todo menos el clasificador CESFAM/CECOSF/POSTA) aparecen como palabra
  // completa en el nombre recibido, y el clasificador también calza, es el
  // mismo centro — sin importar qué palabras adicionales se hayan colado.
  const palabrasRaw = new Set(key.split(" "));
  for (const [canonKey, canonNombre] of ESTABLECIMIENTO_CANONICO) {
    const [clasificador, ...distintivas] = canonKey.split(" ");
    if (!palabrasRaw.has(clasificador)) continue;
    if (distintivas.length > 0 && distintivas.every((w) => palabrasRaw.has(w))) {
      return canonNombre;
    }
  }

  return limpio;
}

function toISODate(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return null;
}

export interface ParsedInforme {
  aggregated: AggregatedRecord[];
  report: EtlReport;
}

/**
 * Parsea un informe estadístico crudo (Excel, nivel-cita, con datos de
 * paciente) y lo agrega a nivel día/estamento/profesional/prestación/estado,
 * sin PII. Misma lógica que scripts/etl-los-cerros.mjs, pero como función
 * reutilizable desde /api/upload-informe.
 */
export function parseInformeBuffer(buffer: Buffer, archivoFuente: string): ParsedInforme {
  const workbook = XLSX.read(buffer, { cellDates: true, dense: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: null });

  const groups = new Map<string, AggregatedRecord>();
  let corrupted = 0;
  let reparadas = 0;
  let missingRequired = 0;
  let minDate: string | null = null;
  let maxDate: string | null = null;
  const corruptedLabels = new Map<string, number>();
  const establecimientos = new Set<string>();

  for (let row of rows) {
    let tipoProfesional = row.TipoProfesional as string | null;
    if (tipoProfesional != null && !VALID_ESTAMENTOS.has(tipoProfesional)) {
      const reparada = repararDesplazamiento(row);
      if (reparada) {
        row = reparada;
        tipoProfesional = row.TipoProfesional as string;
        reparadas++;
      } else {
        corrupted++;
        corruptedLabels.set(tipoProfesional, (corruptedLabels.get(tipoProfesional) ?? 0) + 1);
        continue;
      }
    }

    const fechaISO = toISODate(row.FechaCita);
    const prestacion = row.Prestacion as string | null;
    const profesional =
      typeof row.Profesional === "string" ? row.Profesional.trim().replace(/\s+/g, " ") : null;
    const estado = row.EstadoCita as string | null;
    const establecimiento = normalizarEstablecimiento(
      (row.Establecimiento as string | null) ?? archivoFuente
    );
    const tipoAtencion = (row.TipoAtencion as string | null) ?? "Sin registro";
    const motivoNoAtendido =
      estado === "No Atendido" ? ((row.MotivoNoAtendido as string | null) ?? "Sin motivo registrado") : null;

    // La red APS de Talcahuano es un conjunto cerrado y conocido (10
    // establecimientos, ver REDES) — a diferencia de los estamentos, acá no
    // hay "uno nuevo legítimo" que agregar. Si tras normalizar no calza con
    // ninguno, es la misma familia de corrupción por desplazamiento de
    // columnas (ej. "Grupo B" filtrándose desde PrevisionEpisodio/Plan) que
    // no pasó por el TipoProfesional inválido porque esa columna en
    // particular seguía intacta. Se descarta en vez de crear un
    // establecimiento fantasma.
    if (!TODOS_LOS_ESTABLECIMIENTOS.includes(establecimiento)) {
      corrupted++;
      const label = `[establecimiento] ${establecimiento}`;
      corruptedLabels.set(label, (corruptedLabels.get(label) ?? 0) + 1);
      continue;
    }

    if (!fechaISO || !prestacion || !profesional || typeof estado !== "string" || !tipoProfesional) {
      missingRequired++;
      continue;
    }

    if (!minDate || fechaISO < minDate) minDate = fechaISO;
    if (!maxDate || fechaISO > maxDate) maxDate = fechaISO;
    establecimientos.add(establecimiento);

    const key = `${fechaISO}|${establecimiento}|${tipoProfesional}|${profesional}|${prestacion}|${estado}|${tipoAtencion}|${motivoNoAtendido ?? ""}`;
    const existing = groups.get(key);
    if (existing) {
      existing.cantidad += 1;
    } else {
      groups.set(key, {
        fecha: fechaISO,
        establecimiento,
        estamento: tipoProfesional,
        profesional,
        prestacion,
        estado,
        tipoAtencion,
        motivoNoAtendido,
        cantidad: 1,
      });
    }
  }

  const aggregated = Array.from(groups.values()).sort((a, b) => a.fecha.localeCompare(b.fecha));

  const report: EtlReport = {
    generadoEn: new Date().toISOString(),
    archivoFuente,
    establecimientosDetectados: Array.from(establecimientos).sort(),
    filasLeidas: rows.length,
    filasReparadas: reparadas,
    filasDescartadasPorCorrupcion: corrupted,
    filasDescartadasPorCamposFaltantes: missingRequired,
    filasValidasAgregadas: aggregated.reduce((sum, r) => sum + r.cantidad, 0),
    gruposAgregados: aggregated.length,
    rangoFechas: { desde: minDate, hasta: maxDate },
    etiquetasCorruptasDetectadas: Object.fromEntries(corruptedLabels),
  };

  return { aggregated, report };
}
