import { createServerClient, type SetAllCookies } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refresco de sesion y guardia de rutas.
 *
 * La plantilla SaaS Factory no traia middleware: sin el, el token de Supabase
 * caduca en los Server Components y no hay nada que proteja `/[slug]`.
 *
 * Aqui solo se comprueba que HAYA sesion. La comprobacion de MEMBRESIA (que
 * esta persona pertenezca a esta escuela) vive en el layout de `[slug]`,
 * porque el aislamiento lo hace la RLS de Postgres y no un `if` del
 * middleware. Ver CLAUDE.md, regla 3.
 */

/** Rutas accesibles sin sesion iniciada. */
const PUBLICAS = ['/', '/login', '/signup', '/auth']

function esPublica(ruta: string) {
  return PUBLICAS.some((p) => ruta === p || ruta.startsWith(`${p}/`))
}

export async function middleware(request: NextRequest) {
  let respuesta = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(aGuardar: Parameters<SetAllCookies>[0]) {
          aGuardar.forEach(({ name, value }) => request.cookies.set(name, value))
          respuesta = NextResponse.next({ request })
          aGuardar.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // No insertar codigo entre createServerClient y getUser: getUser revalida el
  // token contra el servidor de Auth y es lo que renueva la cookie. Cualquier
  // cosa en medio puede provocar cierres de sesion difíciles de reproducir.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ruta = request.nextUrl.pathname

  if (!user && !esPublica(ruta)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // Solo la ruta, nunca datos personales en la URL (docs/PRIVACY.md).
    url.searchParams.set('volver', ruta)
    return NextResponse.redirect(url)
  }

  return respuesta
}

export const config = {
  matcher: [
    /*
     * Todo menos estaticos e imagenes. El middleware corre en cada navegacion,
     * y el usuario tipico esta en un telefono de gama media con mala senal.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff2?)$).*)',
  ],
}
