import Link from 'next/link'
import { redirect } from 'next/navigation'
import { misEscuelas } from '@/features/tenencia/queries/escuela'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { Boton } from '@/shared/ui/boton'

export default async function Inicio() {
  const supabase = await crearClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="font-titulo text-3xl text-primario-oscuro">
          Gestión para escuelas Waldorf
        </h1>
        <p className="text-texto-suave">
          El ritmo del año, las familias, los aportes y las comisiones en un
          solo lugar.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link href="/login">
            <Boton>Entrar</Boton>
          </Link>
          <Link href="/signup">
            <Boton variante="suave">Crear cuenta</Boton>
          </Link>
        </div>
      </div>
    )
  }

  const escuelas = await misEscuelas()

  // Quien pertenece a una sola escuela entra directo: es el caso mayoritario.
  if (escuelas.length === 1) redirect(`/${escuelas[0].slug}`)

  return (
    <div className="space-y-6">
      <h1 className="font-titulo text-2xl text-primario-oscuro">
        {escuelas.length ? 'Tus escuelas' : 'Todavía no tienes escuelas'}
      </h1>

      {escuelas.length > 0 && (
        <ul className="space-y-2">
          {escuelas.map((escuela) => (
            <li key={escuela.id}>
              <Link
                href={`/${escuela.slug}`}
                className="block rounded-suave border border-borde bg-superficie px-4 py-3 hover:bg-crema-100"
              >
                {escuela.nombre}
              </Link>
            </li>
          ))}
        </ul>
      )}

      {escuelas.length === 0 && (
        <p className="text-texto-suave">
          Si una escuela te invitó, abre el enlace que te mandaron.
        </p>
      )}

      <Link href="/nueva-escuela">
        <Boton variante="suave">Crear una escuela</Boton>
      </Link>
    </div>
  )
}
