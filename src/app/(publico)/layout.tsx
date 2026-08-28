import Link from 'next/link'

/** Marco de las paginas sin sesion: aire, una columna, movil primero. */
export default function LayoutPublico({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-6 py-6">
        <Link href="/" className="font-titulo text-xl text-tierra-700">
          Gestion Waldorf
        </Link>
      </header>

      <main className="flex flex-1 items-start justify-center px-6 pb-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  )
}
