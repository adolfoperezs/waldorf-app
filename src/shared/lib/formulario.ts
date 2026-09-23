import type { z } from 'zod'

/**
 * Forma comun de retorno de las server actions, para `useActionState`.
 *
 * Los mensajes que llegan aqui son para una persona, no un volcado del error
 * de Postgres. docs/PRIVACY.md prohibe datos personales en mensajes de error,
 * y un `conflicting key value violates exclusion constraint` no le dice nada
 * util a una maestra.
 */
export type EstadoFormulario = {
  ok: boolean
  /** Error general del formulario. */
  error?: string
  /** Errores por campo, tal como los devuelve `z.flattenError`. */
  errores?: Record<string, string[] | undefined>
}

export const estadoInicial: EstadoFormulario = { ok: false }

/**
 * Errores de Zod por ruta completa: `ninos.0.nombre` y no solo `ninos`.
 *
 * `z.flattenError` solo conoce el primer nivel, y un formulario con una
 * lista (los hijos de una familia) necesita marcar el campo exacto. En un
 * formulario plano da lo mismo que flattenError.
 */
export function erroresPorRuta(error: z.ZodError): Record<string, string[]> {
  const errores: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const ruta = issue.path.join('.') || '_'
    ;(errores[ruta] ??= []).push(issue.message)
  }
  return errores
}
