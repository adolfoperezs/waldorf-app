/**
 * Traduce codigos de error de Postgres a lenguaje humano.
 *
 * Las invariantes del dominio las hace cumplir la base (una epoca que se
 * solapa, un acuerdo duplicado). Eso esta bien: es donde tienen que estar.
 * Pero el mensaje que sale de ahi es para un desarrollador, y quien lo va a
 * leer es una maestra.
 *
 * Nunca se devuelve `error.message` de Postgres: puede arrastrar valores de
 * la fila, y docs/PRIVACY.md prohibe datos personales en mensajes de error.
 */

const MENSAJES: Record<string, string> = {
  // exclusion_violation: las dos exclusion constraints de epocas y la de
  // maestro-guia vigente.
  '23P01': 'Esas fechas se cruzan con otro período ya existente. Revisa el rango.',
  // unique_violation
  '23505': 'Ya existe un registro con esos datos.',
  // foreign_key_violation. Con las FK compuestas, casi siempre significa que
  // algo apunta a otra escuela.
  '23503': 'Ese elemento no pertenece a esta escuela.',
  // check_violation
  '23514': 'Los datos no cumplen una regla del sistema.',
  // not_null_violation
  '23502': 'Falta un dato obligatorio.',
  // insufficient_privilege: lo levantan las funciones del ritmo.
  '42501': 'No tienes permiso para hacer este cambio.',
  // no_data_found
  P0002: 'No encontramos ese registro.',
  // invalid_parameter_value: sumar_familia sin ninos.
  '22023': 'Faltan datos: suma al menos un niño o niña.',
}

export function mensajeDeError(codigo?: string | null): string {
  if (codigo && MENSAJES[codigo]) return MENSAJES[codigo]
  return 'No pudimos guardar el cambio. Inténtalo de nuevo.'
}
