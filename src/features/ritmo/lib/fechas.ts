/**
 * Fechas del ritmo.
 *
 * Dos tipos de dato que NO se tratan igual, y confundirlos corre los dias:
 *
 * - `date` (epocas.inicio, festividades.fecha): un dia del calendario, sin
 *   hora ni zona. Llega como 'YYYY-MM-DD'. Si se pasa por `new Date(...)` y
 *   se formatea en la zona de la escuela, un dia puede convertirse en el
 *   anterior. Se formatea SIN conversion de zona.
 *
 * - `timestamptz` (eventos.inicio): un instante. Ese si se presenta en la
 *   zona horaria de LA ESCUELA, nunca la del navegador
 *   (docs/ARCHITECTURE.md): una jornada de Kimun es a las 10 de Algarrobo
 *   aunque el apoderado la mire desde Madrid.
 */

/** Un dia del calendario, tal como lo guarda Postgres. */
export type FechaSola = string

/**
 * Convierte 'YYYY-MM-DD' en un Date anclado al mediodia UTC.
 *
 * El mediodia y no la medianoche: con medianoche, cualquier zona al oeste de
 * Greenwich cae en el dia anterior.
 */
function comoDiaUtc(fecha: FechaSola): Date {
  const [anio, mes, dia] = fecha.split('-').map(Number)
  return new Date(Date.UTC(anio, mes - 1, dia, 12))
}

/** Formatea un dia del calendario. Sin conversion de zona, a proposito. */
export function formatearDia(
  fecha: FechaSola,
  idioma = 'es',
  opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' },
  conAnio = false,
): string {
  return new Intl.DateTimeFormat(idioma, {
    ...opciones,
    ...(conAnio ? { year: 'numeric' } : {}),
    timeZone: 'UTC',
  }).format(comoDiaUtc(fecha))
}

/** Formatea el rango de una epoca: "1 de marzo - 28 de marzo". */
export function formatearRango(
  inicio: FechaSola,
  fin: FechaSola,
  idioma = 'es',
  conAnio = false,
): string {
  const opciones: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  return `${formatearDia(inicio, idioma, opciones, conAnio)} – ${formatearDia(
    fin,
    idioma,
    opciones,
    conAnio,
  )}`
}

/** Formatea un instante en la zona horaria de la escuela. */
export function formatearInstante(
  iso: string,
  zonaHoraria: string,
  idioma = 'es',
  opciones: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  },
): string {
  return new Intl.DateTimeFormat(idioma, {
    ...opciones,
    timeZone: zonaHoraria,
  }).format(new Date(iso))
}

/**
 * El dia de hoy EN LA ESCUELA, como 'YYYY-MM-DD'.
 *
 * Se usa para decidir que epoca esta en curso. Tomarlo del servidor daria el
 * dia en UTC, que entre las 21:00 y la medianoche de Chile ya es el siguiente.
 */
export function hoyEnEscuela(zonaHoraria: string): FechaSola {
  // 'en-CA' produce exactamente YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaHoraria,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/**
 * ¿El anio lectivo cruza el cambio de anio civil?
 *
 * En el hemisferio sur no (marzo a diciembre); en el norte si (septiembre a
 * junio). Cuando cruza hay que mostrar el anio en las fechas, o "5 de abril"
 * despues de "1 de diciembre" parece un error de orden.
 */
export function cruzaAnioCivil(inicio: FechaSola, fin: FechaSola): boolean {
  return inicio.slice(0, 4) !== fin.slice(0, 4)
}

/** ¿Cae `dia` dentro del rango, extremos incluidos? Comparacion de texto. */
export function dentroDe(dia: FechaSola, inicio: FechaSola, fin: FechaSola) {
  // 'YYYY-MM-DD' ordena igual como texto que como fecha. Sin objetos Date.
  return dia >= inicio && dia <= fin
}

/** Dia de la semana (1 = lunes) de hoy en la escuela, para la minuta. */
export function diaSemanaEnEscuela(zonaHoraria: string): number {
  const dia = new Date(`${hoyEnEscuela(zonaHoraria)}T12:00:00Z`).getUTCDay()
  return dia === 0 ? 7 : dia // Postgres y la minuta usan 1=lunes, 7=domingo.
}

export const NOMBRE_DIA = [
  'Lunes',
  'Martes',
  'Miercoles',
  'Jueves',
  'Viernes',
  'Sabado',
  'Domingo',
] as const

/**
 * Convierte fecha y hora LOCALES DE LA ESCUELA en un instante UTC.
 *
 * "El 21 de septiembre a las 10:00" significa las 10 de Algarrobo, no las 10
 * del navegador de quien lo escribe. Sin esto, una administradora de viaje
 * agendaria la jornada a una hora distinta de la que quiso.
 *
 * El desfase horario se pregunta para ESE dia, no para hoy: entre septiembre
 * y abril Chile cambia de huso, y usar el desfase actual correria el evento
 * una hora.
 */
export function instanteEnZona(
  fecha: FechaSola,
  hora: string,
  zonaHoraria: string,
): string {
  const horaCompleta = /^\d{2}:\d{2}$/.test(hora) ? `${hora}:00` : hora

  const partes = new Intl.DateTimeFormat('en-US', {
    timeZone: zonaHoraria,
    timeZoneName: 'longOffset',
  }).formatToParts(comoDiaUtc(fecha))

  // 'GMT-04:00', o 'GMT' en UTC.
  const etiqueta = partes.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT'
  const desfase = etiqueta.replace('GMT', '') || '+00:00'

  return new Date(`${fecha}T${horaCompleta}${desfase}`).toISOString()
}
