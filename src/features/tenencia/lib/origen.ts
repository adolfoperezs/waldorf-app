import 'server-only'
import { headers } from 'next/headers'

/**
 * Origen publico del sitio, para armar enlaces que salen hacia WhatsApp.
 *
 * NEXT_PUBLIC_SITE_URL manda si existe: detras de un proxy, el host de la
 * peticion puede no ser el dominio que ve la comunidad.
 */
export async function origen(): Promise<string> {
  const configurado = process.env.NEXT_PUBLIC_SITE_URL
  if (configurado) return configurado.replace(/\/$/, '')

  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const protocolo = h.get('x-forwarded-proto') ?? 'https'
  return `${protocolo}://${host}`
}
