import { Plus } from 'lucide-react'
import { notFound } from 'next/navigation'
import { invitarIntegrante, sumarFamilia } from '@/features/comunidad/actions/familias'
import { ChipCiclo } from '@/features/comunidad/components/chip-ciclo'
import { FormularioInvitarIntegrante } from '@/features/comunidad/components/formulario-invitar-integrante'
import { FormularioSumarFamilia } from '@/features/comunidad/components/formulario-sumar-familia'
import {
  familiasDeEscuela,
  gruposConCiclo,
  invitacionesDeFamilias,
  ninosDeEscuela,
} from '@/features/comunidad/queries/comunidad'
import { formatearInstante } from '@/features/ritmo/lib/fechas'
import { revocarInvitacion } from '@/features/tenencia/actions/invitaciones'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'
import { BotonAccion } from '@/shared/ui/boton-accion'
import { PanelLateral } from '@/shared/ui/panel-lateral'
import { Tarjeta } from '@/shared/ui/tarjeta'

/**
 * Las familias de la escuela y sus ninos. Solo administracion: familias y
 * ninos son su ambito (docs/DOMAIN.md, H13), y la lectura de ninos pasa por
 * ninos_de_escuela, que queda en la auditoria.
 */
export default async function PaginaFamilias({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { escuela, esAdministracion } = await cargarEscuela(slug)

  // Esconder la pagina es cortesia, no seguridad: lo decide la RLS.
  if (!esAdministracion) notFound()

  const ctx = { escuelaId: escuela.id, slug: escuela.slug, escuelaNombre: escuela.nombre }

  const [familias, ninos, grupos, invitaciones] = await Promise.all([
    familiasDeEscuela(escuela.id),
    ninosDeEscuela(escuela.id),
    gruposConCiclo(escuela.id),
    invitacionesDeFamilias(escuela.id),
  ])

  const grupoPorId = new Map(grupos.map((g) => [g.id, g]))
  const ahora = Date.now()

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-titulo text-3xl">Familias</h1>
          <p className="text-texto-suave">
            La familia es la unidad: sus integrantes ven a los mismos niños.
          </p>
        </div>
        <PanelLateral
          titulo="Sumar familia"
          descripcion="La familia, sus niños y un enlace de bienvenida para mandar por WhatsApp."
          disparador={
            <>
              <Plus aria-hidden className="size-4" />
              Sumar familia
            </>
          }
        >
          <FormularioSumarFamilia
            accion={sumarFamilia.bind(null, ctx)}
            grupos={grupos.map((g) => ({ id: g.id, nombre: g.nombre }))}
          />
        </PanelLateral>
      </header>

      {familias.length === 0 ? (
        <Tarjeta className="space-y-2">
          <p>Todavía no hay familias.</p>
          <p className="text-sm text-texto-suave">
            Suma la primera: la escuela recibe un enlace para mandarle por WhatsApp,
            y la familia entra viendo ya el ritmo de sus hijos.
            {grupos.length === 0 &&
              ' Conviene crear antes los grupos, para asignar a cada niño el suyo.'}
          </p>
        </Tarjeta>
      ) : (
        <ul className="space-y-4">
          {familias.map((familia) => {
            const hijos = ninos.filter((n) => n.familia_id === familia.id)
            const pendientes = invitaciones.filter((i) => i.familia_id === familia.id)
            const miembros = familia.familia_miembros ?? []
            const nombresHijos = hijos.map((h) => h.nombre_preferido ?? h.nombre)

            return (
              <li key={familia.id}>
                <Tarjeta className="space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h2 className="font-titulo text-xl">{familia.nombre}</h2>
                    <PanelLateral
                      titulo="Invitar a otro integrante"
                      descripcion={familia.nombre}
                      variante="suave"
                      disparador="Invitar a alguien más"
                    >
                      <FormularioInvitarIntegrante
                        accion={invitarIntegrante.bind(null, ctx, familia.id, nombresHijos)}
                      />
                    </PanelLateral>
                  </div>

                  <ul className="space-y-2">
                    {hijos.map((hijo) => {
                      const grupo = hijo.grupo_id ? grupoPorId.get(hijo.grupo_id) : null
                      return (
                        <li key={hijo.id} className="flex flex-wrap items-center gap-2">
                          <span>
                            {hijo.nombre_preferido ?? hijo.nombre} {hijo.apellidos}
                          </span>
                          {grupo ? (
                            <>
                              <span className="text-sm text-texto-suave">· {grupo.nombre}</span>
                              <ChipCiclo ciclo={grupo.ciclo} />
                            </>
                          ) : (
                            <span className="text-sm text-texto-suave">· sin grupo</span>
                          )}
                        </li>
                      )
                    })}
                  </ul>

                  <div className="space-y-1 border-t border-borde pt-3 text-sm">
                    {miembros.length > 0 ? (
                      <p className="text-texto-suave">
                        Entran:{' '}
                        {miembros
                          .map((m) => m.perfiles?.nombre_completo ?? 'Sin nombre')
                          .join(', ')}
                      </p>
                    ) : (
                      <p className="text-texto-suave">Nadie de la familia ha entrado todavía.</p>
                    )}

                    {pendientes.map((inv) => {
                      const caducada = new Date(inv.expira_en).getTime() <= ahora
                      return (
                        <div
                          key={inv.id}
                          className="flex flex-wrap items-center justify-between gap-3"
                        >
                          <p className="text-texto-suave">
                            Enlace {inv.email ? `para ${inv.email}` : 'sin correo'} ·{' '}
                            {caducada
                              ? 'caducó'
                              : `caduca el ${formatearInstante(inv.expira_en, escuela.zona_horaria, escuela.idioma, { day: 'numeric', month: 'long' })}`}
                          </p>
                          <BotonAccion
                            accion={revocarInvitacion.bind(null, ctx, inv.id)}
                            variante="fantasma"
                          >
                            Revocar
                          </BotonAccion>
                        </div>
                      )
                    })}
                  </div>
                </Tarjeta>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
