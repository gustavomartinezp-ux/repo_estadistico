/**
 * Estamentos válidos conocidos del sistema clínico. Usado tanto para validar
 * filas en el ETL (src/lib/etl.ts) como para poblar selectores de filtro en
 * el cliente — vive en un módulo sin dependencias pesadas (nada de "xlsx")
 * para poder importarse seguro desde componentes "use client".
 */
export const ESTAMENTOS_CONOCIDOS = [
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
] as const;
