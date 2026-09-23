import { CircleUserRound, Sprout } from 'lucide-react'
import Link from 'next/link'
import { miFamilia, misComisiones } from '@/features/economia/queries/economia'
import { cerrarSesion } from '@/features/tenencia/actions/auth'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'
import { misEscuelas } from '@/features/tenencia/queries/escuela'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { EnlaceNavegacion } from '@/shared/ui/enlace-navegacion'

/**
 * Marco de todo lo autenticado. La escuela va en la ruta para que el contexto
 * de tenant sea explicito y cambiar de escuela sea trivial.
 *
 * Aqui se comprueba la MEMBRESIA, no en proxy.ts: `cargarEscuela` consulta con
 * la sesion del usuario y la politica escuelas_select devuelve cero filas si
 * no pertenece.
 *
 * Cada rol ve sus secciones. Esconder un enlace es cortesia: quien autoriza
 * cada lectura y escritura es la RLS.
 */
export default async function LayoutEscuela({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { escuela, roles, esGestor, esAdministracion } = await cargarEscuela(slug)
  const escuelas = await misEscuelas()

  // El nombre sale de los metadatos de la cuenta: sin otra consulta a la base.
  const supabase = await crearClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const nombreCompleto = user?.user_metadata?.nombre_completo
  const primerNombre =
    typeof nombreCompleto === 'string' ? nombreCompleto.trim().split(/\s+/)[0] : null

  // Dos consultas livianas para saber que secciones de economia mostrar.
  const [familia, comisiones] = user
    ? await Promise.all([miFamilia(escuela.id, user.id), misComisiones(escuela.id, user.id)])
    : [null, []]
  const veEconomia = comisiones.some((c) => c.veEconomia)

  const tieneCurso =
    esGestor || roles.some((rol) => rol === 'maestro_guia' || rol === 'maestro_especialidad')

  const base = `/${escuela.slug}`
  const enlaces = [
    { href: base, texto: 'Inicio', exacto: true },
    ...(tieneCurso ? [{ href: `${base}/ritmo`, texto: 'Mi curso' }] : []),
    { href: `${base}/calendario`, texto: 'Calendario' },
    { href: `${base}/eventos`, texto: 'Encuentros' },
    { href: `${base}/campanas`, texto: 'Campañas' },
    ...(familia ? [{ href: `${base}/mi-aporte`, texto: 'Nuestro aporte' }] : []),
    // La administracion llega al panel desde Economia.
    ...(veEconomia && !esAdministracion
      ? [{ href: `${base}/panel-economico`, texto: 'Panel económico' }]
      : []),
    ...(esAdministracion
      ? [
          { href: `${base}/economia`, texto: 'Economía' },
          { href: `${base}/familias`, texto: 'Familias' },
        ]
      : []),
    ...(esGestor
      ? [
          { href: `${base}/grupos`, texto: 'Grupos' },
          { href: `${base}/comisiones`, texto: 'Comisiones' },
          { href: `${base}/epocas`, texto: 'Épocas' },
          { href: `${base}/anios`, texto: 'Años' },
        ]
      : []),
    ...(esAdministracion ? [{ href: `${base}/miembros`, texto: 'Miembros' }] : []),
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b border-borde bg-lienzo/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 pt-4">
          <Link href={base} className="flex items-center gap-2 font-titulo text-lg text-primario-oscuro">
            <Sprout aria-hidden className="size-5 text-salvia-500" />
            {escuela.nombre}
          </Link>

          {escuelas.length > 1 && (
            <nav aria-label="Cambiar de escuela" className="flex gap-2">
              {escuelas
                .filter((otra) => otra.slug !== escuela.slug)
                .map((otra) => (
                  <Link
                    key={otra.id}
                    href={`/${otra.slug}`}
                    className="text-sm text-texto-suave underline"
                  >
                    {otra.nombre}
                  </Link>
                ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-4">
            {primerNombre && (
              <span className="inline-flex items-center gap-1.5 text-sm text-texto-suave">
                <CircleUserRound aria-hidden className="size-4" />
                {primerNombre}
              </span>
            )}
            <form action={cerrarSesion}>
              <button
                type="submit"
                className="min-h-11 text-sm text-texto-suave underline hover:text-texto"
              >
                Salir
              </button>
            </form>
          </div>
        </div>

        <nav aria-label="Secciones" className="mx-auto max-w-5xl overflow-x-auto px-6">
          <ul className="flex gap-5 whitespace-nowrap">
            {enlaces.map((enlace) => (
              <li key={enlace.href}>
                <EnlaceNavegacion href={enlace.href} exacto={enlace.exacto}>
                  {enlace.texto}
                </EnlaceNavegacion>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  )
}
