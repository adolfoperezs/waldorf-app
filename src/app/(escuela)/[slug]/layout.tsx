import Link from 'next/link'
import { cerrarSesion } from '@/features/tenencia/actions/auth'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'
import { misEscuelas } from '@/features/tenencia/queries/escuela'

/**
 * Marco de todo lo autenticado. La escuela va en la ruta para que el contexto
 * de tenant sea explicito y cambiar de escuela sea trivial.
 *
 * Aqui se comprueba la MEMBRESIA, no en proxy.ts: `cargarEscuela` consulta con
 * la sesion del usuario y la politica escuelas_select devuelve cero filas si
 * no pertenece.
 */
export default async function LayoutEscuela({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { escuela, esGestor } = await cargarEscuela(slug)
  const escuelas = await misEscuelas()

  const enlaces = [
    { href: `/${escuela.slug}`, texto: 'Calendario' },
    { href: `/${escuela.slug}/eventos`, texto: 'Encuentros' },
    ...(esGestor
      ? [
          { href: `/${escuela.slug}/epocas`, texto: 'Epocas' },
          { href: `/${escuela.slug}/anios`, texto: 'Anios' },
        ]
      : []),
  ]

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-borde">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-6 py-4">
          <Link
            href={`/${escuela.slug}`}
            className="font-titulo text-lg text-tierra-800"
          >
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

          <form action={cerrarSesion} className="ml-auto">
            <button type="submit" className="text-sm text-texto-suave underline">
              Salir
            </button>
          </form>
        </div>

        <nav
          aria-label="Secciones"
          className="mx-auto max-w-5xl overflow-x-auto px-6 pb-3"
        >
          <ul className="flex gap-4 whitespace-nowrap">
            {enlaces.map((enlace) => (
              <li key={enlace.href}>
                <Link
                  href={enlace.href}
                  className="text-sm text-texto-suave hover:text-texto"
                >
                  {enlace.texto}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
    </div>
  )
}
