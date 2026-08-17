/**
 * ETL: informe estadístico crudo (Excel, nivel-cita, con datos de paciente)
 * -> agregado diario sin PII, listo para servir desde /api/atenciones.
 *
 * Uso:
 *   node scripts/etl-los-cerros.mjs [ruta-al-xlsx]
 *
 * Por defecto lee "../INFORME _ESTADISTICO _LOS _CERROS.xlsx" (un nivel
 * arriba del proyecto) para no duplicar el archivo con datos de pacientes
 * dentro del repo. Nunca escribe RUT, nombre, teléfono, email ni diagnóstico
 * del paciente en el output: solo cuenta atenciones agrupadas.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as XLSX from "xlsx";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");

const inputPath =
  process.argv[2] ?? path.resolve(PROJECT_ROOT, "..", "INFORME _ESTADISTICO _LOS _CERROS.xlsx");
const outputDir = path.resolve(PROJECT_ROOT, "data");
const outputFile = path.join(outputDir, "atenciones.json");
const reportFile = path.join(outputDir, "etl-report.json");

// Estamentos válidos conocidos. Cualquier fila cuyo "TipoProfesional" no
// calce con esta lista, y no se pueda reparar (ver repararDesplazamiento),
// se descarta. Debe mantenerse igual a la lista en src/lib/estamentos.ts.
const VALID_ESTAMENTOS = new Set([
  "Administrativo",
  "Agente Comunitario",
  "Asistente Social",
  "Educador (a) de Párvulos",
  "Enfermera (o)",
  "Fonoaudiólogo (a)",
  "Kinesiólogo (a)",
  "Matrón (a)",
  "Médico",
  "Nutricionista",
  "Odontólogo",
  "Podólogo",
  "Profesor (a) Educación Física",
  "Psicólogo (a)",
  "Químico Farmacéutico",
  "Tecnólogo Médico",
  "Terapeuta Ocupacional",
  "Técnico Nivel Superior",
  "Técnico Paramédico",
  "Técnico Rehabilitación Alcohol y Drogas",
]);

const RUT_PATTERN = /^\d{6,9}-[\dkK]$/;

function pareceRut(valor) {
  return typeof valor === "string" && RUT_PATTERN.test(valor.trim());
}

// Cuando el nombre de un profesional trae una coma en el sistema origen, el
// export a Excel lo parte en dos celdas y desplaza en +1 el resto de las
// columnas de esa fila (ver explicación detallada en src/lib/etl.ts). Se
// detecta porque "Especialidad" de esa misma fila SÍ calza con un estamento
// válido; si "Profesional" parece un RUT es un desplazamiento distinto y no
// se repara.
function repararDesplazamiento(row) {
  const especialidad = row.Especialidad;
  const profesional = row.Profesional;
  const tipoProfesional = row.TipoProfesional;
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

if (!existsSync(inputPath)) {
  console.error(`No se encontró el archivo fuente: ${inputPath}`);
  console.error("Pasa la ruta como argumento: node scripts/etl-los-cerros.mjs <ruta.xlsx>");
  process.exit(1);
}

console.log(`Leyendo ${inputPath} ...`);
const workbook = XLSX.read(readFileSync(inputPath), { cellDates: true, dense: true });
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null });
console.log(`${rows.length} filas leídas de la hoja "${sheetName}".`);

function toISODate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  return null;
}

const groups = new Map(); // key -> record agregado
let corrupted = 0;
let reparadas = 0;
let missingRequired = 0;
let minDate = null;
let maxDate = null;
const corruptedLabels = new Map();

for (let row of rows) {
  let tipoProfesional = row.TipoProfesional;
  if (tipoProfesional != null && !VALID_ESTAMENTOS.has(tipoProfesional)) {
    const reparada = repararDesplazamiento(row);
    if (reparada) {
      row = reparada;
      tipoProfesional = row.TipoProfesional;
      reparadas++;
    } else {
      corrupted++;
      corruptedLabels.set(tipoProfesional, (corruptedLabels.get(tipoProfesional) ?? 0) + 1);
      continue;
    }
  }

  const fechaISO = toISODate(row.FechaCita);
  const prestacion = row.Prestacion;
  const profesional = typeof row.Profesional === "string" ? row.Profesional.trim().replace(/\s+/g, " ") : null;
  const estado = row.EstadoCita;
  const establecimiento = row.Establecimiento ?? "CESFAM Los Cerros";
  const tipoAtencion = row.TipoAtencion ?? "Sin registro";
  const motivoNoAtendido = estado === "No Atendido" ? (row.MotivoNoAtendido ?? "Sin motivo registrado") : null;

  if (!fechaISO || !prestacion || !profesional || typeof estado !== "string" || !tipoProfesional) {
    missingRequired++;
    continue;
  }

  if (!minDate || fechaISO < minDate) minDate = fechaISO;
  if (!maxDate || fechaISO > maxDate) maxDate = fechaISO;

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

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputFile, JSON.stringify(aggregated));

const report = {
  generadoEn: new Date().toISOString(),
  archivoFuente: path.basename(inputPath),
  filasLeidas: rows.length,
  filasReparadas: reparadas,
  filasDescartadasPorCorrupcion: corrupted,
  filasDescartadasPorCamposFaltantes: missingRequired,
  filasValidasAgregadas: aggregated.reduce((sum, r) => sum + r.cantidad, 0),
  gruposAgregados: aggregated.length,
  rangoFechas: { desde: minDate, hasta: maxDate },
  etiquetasCorruptasDetectadas: Object.fromEntries(corruptedLabels),
};
writeFileSync(reportFile, JSON.stringify(report, null, 2));

console.log("--- Reporte ETL ---");
console.log(JSON.stringify(report, null, 2));
console.log(`\nOK: ${outputFile}`);
