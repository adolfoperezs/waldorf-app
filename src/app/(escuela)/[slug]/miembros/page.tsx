import { notFound } from 'next/navigation'
import {
  crearInvitacion,
  quitarMiembro,
  revocarInvitacion,
} from '@/features/tenencia/actions/invitaciones'
import { FormularioInvitacion } from '@/features/tenencia/components/formulario-invitacion'
import { NOMBRE_ROL } from '@/features/tenencia/lib/roles'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'
import {
  invitacionesPendientes,
  miembrosDeEscuela,
} from '@/features/tenencia/queries/miembros'
import { formatearInstante } from '@/features/ritmo/lib/fechas'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { BotonAccion } from '@/shared/ui/boton-accion'
import { Tarjeta } from '@/shared/ui/tarjeta'

export default async function PaginaMiembros({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { escuela, esAdministracion } = await cargarEscuela(slug)

  // Esconder la pagina es cortesia, no seguridad: las invitaciones y las
  // membresias solo las escribe administracion por RLS.
  if (!esAdministracion) notFound()

  const ctx = { escuelaId: escuela.id, slug: escuela.slug, escuelaNombre: escuela.nombre }

  const supabase = await crearClienteServidor()
  const [
    miembros,
    pendientes,
    {
      data: { user },
    },
  ] = await Promise.all([
    miembrosDeEscuela(escuela.id),
    invitacionesPendientes(escuela.id),
    supabase.auth.getUser(),
  ])

  // Una persona puede tener varios roles: se agrupan por persona.
  const personas = new Map<
    string,
    { nombre: string; email: string | null; roles: { id: string; rol: keyof typeof NOMBRE_ROL }[] }
  >()
  for (const m of miembros) {
    const persona = personas.get(m.perfil_id) ?? {
      nombre: m.perfiles?.nombre_completo ?? 'Sin nombre',
      email: m.perfiles?.email ?? null,
      roles: [],
    }
    persona.roles.push({ id: m.id, rol: m.rol })
    personas.set(m.perfil_id, persona)
  }

  const ahora = Date.now()

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="font-titulo text-3xl text-tierra-800">Miembros</h1>
        <p className="text-texto-suave">
          Quienes forman parte de {escuela.nombre} y con que rol.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-titulo text-xl text-tierra-700">Invitar a alguien</h2>
        <p className="text-texto-suave">
          Se crea un enlace para mandar por WhatsApp. La persona lo abre, crea su
          cuenta y entra a la escuela con el rol que elijas.
        </p>
        <Tarjeta>
          <FormularioInvitacion accion={crearInvitacion.bind(null, ctx)} />
        </Tarjeta>
      </section>

      {pendientes.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-titulo text-xl text-tierra-700">
            Invitaciones sin aceptar
          </h2>
          <ul className="space-y-3">
            {pendientes.map((inv) => {
              const caducada = new Date(inv.expira_en).getTime() <= ahora
              return (
                <li key={inv.id}>
                  <Tarjeta className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="font-medium">{NOMBRE_ROL[inv.rol]}</p>
                      <p className="text-sm text-texto-suave">
                        {inv.email ?? 'Cualquiera con el enlace'}
                        {' · '}
                        {caducada
                          ? 'caducada'
                          : `caduca el ${formatearInstante(inv.expira_en, escuela.zona_horaria, escuela.idioma, { day: 'numeric', month: 'long' })}`}
                      </p>
                    </div>
                    <BotonAccion accion={revocarInvitacion.bind(null, ctx, inv.id)}>
                      Revocar
                    </BotonAccion>
                  </Tarjeta>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-titulo text-xl text-tierra-700">
          {personas.size} {personas.size === 1 ? 'persona' : 'personas'}
        </h2>
        <ul className="space-y-3">
          {[...personas.entries()].map(([perfilId, persona]) => (
            <li key={perfilId}>
              <Tarjeta className="space-y-3">
                <div>
                  <p className="font-medium">
                    {persona.nombre}
                    {perfilId === user?.id ? ' (tu)' : ''}
                  </p>
                  {persona.email && (
                    <p className="text-sm text-texto-suave">{persona.email}</p>
                  )}
                </div>
                <ul className="space-y-2">
                  {persona.roles.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center justify-between gap-3"
                    >
                      <span className="text-sm">{NOMBRE_ROL[r.rol]}</span>
                      {perfilId !== user?.id && (
                        <BotonAccion accion={quitarMiembro.bind(null, ctx, r.id)}>
                          Quitar
                        </BotonAccion>
                      )}
                    </li>
                  ))}
                </ul>
              </Tarjeta>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
