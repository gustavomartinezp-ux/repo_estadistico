/**
 * El sistema clínico origen a veces deja en la columna "Profesional" el
 * nombre de un servicio/equipo en vez de una persona (ej. procedimientos de
 * enfermería o técnico que no se asignan a un funcionario específico:
 * electrocardiograma, vacunatorio, toma de muestras, farmacia). La fila en sí
 * es válida — la cita/atención ocurrió y debe seguir contando en los totales
 * — así que esto NO se descarta en el ETL. Solo se excluye de las vistas que
 * listan "profesionales" como personas (página Profesionales, combobox de
 * filtro, conteos de "profesionales activos", gráfico agrupado por
 * profesional): ahí sí sería engañoso mostrar "FARMACIA CPA" como si fuera
 * un funcionario.
 *
 * Se detecta con dos señales: una lista explícita de las etiquetas ya vistas,
 * más una heurística general (la frase se repite a sí misma completa, ej.
 * "VACUNATORIO VACUNATORIO") que debería capturar variantes futuras del
 * mismo patrón sin tener que ampliar la lista a mano cada vez.
 */
const ETIQUETAS_NO_PERSONA = new Set<string>([
  "ELECTROCARDIOGRAMA ECG",
  "FARMACIA CPA",
  "LAVADO OIDOS",
  "LAVADO OIDOS LAVADO OIDOS",
  "TENS",
  "TENS EXAMENES",
  "TEST AGUDEZA VISUAL TEST AGUDEZA VISUAL",
  "TEST VISUAL TEST VISUAL",
  "TOMA DE MUESTRAS EXAMENES",
  "VACUNAS VACUNATORIO",
  "VACUNATORIO VACUNATORIO",
]);

function esFraseAutoDuplicada(nombre: string): boolean {
  const palabras = nombre.trim().split(/\s+/);
  const n = palabras.length;
  if (n < 2 || n % 2 !== 0) return false;
  const mitad = n / 2;
  return palabras.slice(0, mitad).join(" ") === palabras.slice(mitad).join(" ");
}

export function esProfesionalReal(nombre: string): boolean {
  const normalizado = nombre.trim().toUpperCase();
  if (ETIQUETAS_NO_PERSONA.has(normalizado)) return false;
  return !esFraseAutoDuplicada(normalizado);
}
