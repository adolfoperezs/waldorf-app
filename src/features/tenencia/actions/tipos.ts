/**
 * Forma comun de retorno de las server actions, para usar con `useActionState`.
 *
 * Regla: los mensajes que llegan aqui son para una persona, no un volcado del
 * error de Postgres. docs/PRIVACY.md prohibe datos personales en mensajes de
 * error, y un `duplicate key value violates unique constraint` tampoco le
 * dice nada util a una maestra.
 */
export type EstadoFormulario = {
  ok: boolean
  /** Error general del formulario. */
  error?: string
  /** Errores por campo, tal como los devuelve `z.flattenError`. */
  errores?: Record<string, string[] | undefined>
}

export const estadoInicial: EstadoFormulario = { ok: false }
