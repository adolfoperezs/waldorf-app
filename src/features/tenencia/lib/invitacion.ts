import 'server-only'
import { createHash, randomBytes } from 'node:crypto'

/**
 * El codigo de una invitacion.
 *
 * 32 bytes aleatorios en base64url: 43 caracteres que viajan en la URL sin
 * escaparse. Adivinarlo es imposible en la practica (2^256).
 *
 * La base guarda solo la huella SHA-256. La funcion aceptar_invitacion la
 * recalcula con `sha256(convert_to(codigo, 'UTF8'))`, que da exactamente la
 * misma huella: verificado contra produccion al aplicar 0006.
 */
export function generarCodigo(): { codigo: string; huella: string } {
  const codigo = randomBytes(32).toString('base64url')
  return { codigo, huella: huellaDe(codigo) }
}

export function huellaDe(codigo: string): string {
  return createHash('sha256').update(codigo, 'utf8').digest('hex')
}

/** Formato de un codigo valido. Se comprueba antes de ir a la base. */
export const FORMATO_CODIGO = /^[A-Za-z0-9_-]{43}$/
