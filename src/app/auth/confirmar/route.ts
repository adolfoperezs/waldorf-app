import type { EmailOtpType } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { destinoSeguro } from '@/features/tenencia/lib/destino'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'

/**
 * Adonde llegan los enlaces de los correos de Supabase: recuperar la
 * contrasena y, cuando se active, confirmar el correo al registrarse.
 *
 * Las plantillas de correo mandan `token_hash` y no el `code` de PKCE: el
 * code solo se puede canjear en el MISMO navegador que pidio el correo, y lo
 * normal es pedirlo en el computador y abrirlo en el telefono. `code` se
 * acepta igual, por si una plantilla vuelve a la de fabrica.
 *
 * `siguiente` pasa por destinoSeguro: solo rutas internas.
 */
const TIPOS: EmailOtpType[] = ['recovery', 'email', 'signup', 'invite', 'magiclink', 'email_change']

export async function GET(request: NextRequest) {
  const url = request.nextUrl
  const tokenHash = url.searchParams.get('token_hash')
  const tipo = url.searchParams.get('type') as EmailOtpType | null
  const code = url.searchParams.get('code')
  const siguiente = destinoSeguro(url.searchParams.get('siguiente'))

  const supabase = await crearClienteServidor()
  let valido = false

  if (tokenHash && tipo && TIPOS.includes(tipo)) {
    const { error } = await supabase.auth.verifyOtp({ type: tipo, token_hash: tokenHash })
    valido = !error
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    valido = !error
  }

  if (valido) return NextResponse.redirect(new URL(siguiente, url.origin))

  // Caducado, ya usado o manipulado. Sin detalles: no hay nada util que decir.
  return NextResponse.redirect(new URL('/login?aviso=enlace-invalido', url.origin))
}
