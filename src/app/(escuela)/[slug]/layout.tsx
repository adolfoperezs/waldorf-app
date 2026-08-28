import Link from 'next/link'
import { notFound } from 'next/navigation'
import { cerrarSesion } from '@/features/tenencia/actions/auth'
import { escuelaPorSlug, misEscuelas } from '@/features/tenencia/queries/escuela'

/**
 * Marco de todo lo autenticado. La escuela va en la ruta para que el contexto
 * de tenant sea explicito y cambiar de escuela sea trivial.
 *
 * Aqui es donde se comprueba la MEMBRESIA, no en el middleware: `escuelaPorSlug`
 * consulta con la sesion del usuario y la politica escuelas_select ya devuelve
 * cero filas si no pertenece. Un 404 y no un 403: quien no es miembro no tiene
 * por que saber si la escuela existe.
 */
export default async function LayoutEscuela({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const escuela = await escuelaPorSlug(slug)

  if (!escuela) notFound()

  const escuelas = await misEscuelas()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-borde px-6 py-4">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4">
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
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {children}
      </main>
    </div>
  )
}
