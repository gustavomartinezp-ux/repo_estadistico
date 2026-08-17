import type { RedEstablecimientos } from "./types";

/** Estructura de red de la comuna de Talcahuano (DAS). */
export const REDES: RedEstablecimientos[] = [
  {
    cesfam: "CESFAM Los Cerros",
    dependencias: ["CECOSF Villa Centinela", "CECOSF Los Lobos", "Posta Tumbes"],
  },
  {
    cesfam: "CESFAM Paulina Avendaño",
    dependencias: ["CECOSF Esmeralda", "CECOSF 8 de Mayo"],
  },
  {
    cesfam: "CESFAM San Vicente",
    dependencias: ["CECOSF Libertad Gaete"],
  },
  {
    cesfam: "CESFAM Leocan Portus",
    dependencias: [],
  },
];

/** Todos los establecimientos (cabeceras + dependencias) en una lista plana. */
export const TODOS_LOS_ESTABLECIMIENTOS: string[] = REDES.flatMap((red) => [
  red.cesfam,
  ...red.dependencias,
]);

/** Dado un establecimiento cualquiera, retorna el nombre de su CESFAM cabecera. */
export function getRedDeEstablecimiento(establecimiento: string): string | null {
  const red = REDES.find(
    (r) => r.cesfam === establecimiento || r.dependencias.includes(establecimiento)
  );
  return red?.cesfam ?? null;
}

/** Establecimientos (cabecera + dependencias) que pertenecen a una red dada. */
export function getEstablecimientosDeRed(cesfam: string): string[] {
  const red = REDES.find((r) => r.cesfam === cesfam);
  if (!red) return [];
  return [red.cesfam, ...red.dependencias];
}
