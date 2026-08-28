import { createServerClient, type SetAllCookies } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Cliente de Supabase para Server Components y server actions.
 *
 * Usa SIEMPRE la anon key. La service_role key jamas aparece en codigo que
 * atiende peticiones de usuarios (CLAUDE.md, regla 3): el aislamiento entre
 * escuelas lo hace la RLS, y la service_role la saltaria por completo.
 */
export async function crearClienteServidor() {
  const almacenCookies = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return almacenCookies.getAll()
        },
        setAll(aGuardar: Parameters<SetAllCookies>[0]) {
          try {
            aGuardar.forEach(({ name, value, options }) =>
              almacenCookies.set(name, value, options),
            )
          } catch {
            // Los Server Components no pueden escribir cookies. El middleware
            // ya refresco la sesion, asi que aqui se puede ignorar.
          }
        },
      },
    },
  )
}
