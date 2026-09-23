import { Plus } from 'lucide-react'
import { notFound } from 'next/navigation'
import {
  crearComision,
  quitarIntegrante,
  sumarIntegrante,
} from '@/features/comunidad/actions/comisiones'
import {
  FormularioComision,
  FormularioIntegrante,
} from '@/features/comunidad/components/formularios-comision'
import {
  comisionesConIntegrantes,
  personasDeEscuela,
} from '@/features/comunidad/queries/comunidad'
import type { ContextoEscuela } from '@/features/ritmo/actions/contexto'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'
import { BotonAccion } from '@/shared/ui/boton-accion'
import { PanelLateral } from '@/shared/ui/panel-lateral'
import { Tarjeta } from '@/shared/ui/tarjeta'

/**
 * Comisiones y sus integrantes (ROADMAP, Fase 2). Mixtas entre familias y
 * equipo: es el trabajo comunitario organizado (DOMAIN §2).
 */
export default async function PaginaComisiones({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { escuela, esGestor } = await cargarEscuela(slug)
  if (!esGestor) notFound()

  const ctx: ContextoEscuela = {
    escuelaId: escuela.id,
    slug: escuela.slug,
    zonaHoraria: escuela.zona_horaria,
  }

  const [comisiones, personas] = await Promise.all([
    comisionesConIntegrantes(escuela.id),
    personasDeEscuela(escuela.id),
  ])

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-titulo text-3xl">Comisiones</h1>
          <p className="text-texto-suave">
            El trabajo comunitario organizado. Quien integra una comisión gestiona sus
            campañas.
          </p>
        </div>
        <PanelLateral
          titulo="Nueva comisión"
          disparador={
            <>
              <Plus aria-hidden className="size-4" />
              Nueva comisión
            </>
          }
        >
          <FormularioComision accion={crearComision.bind(null, ctx)} />
        </PanelLateral>
      </header>

      {comisiones.length === 0 ? (
        <p className="text-texto-suave">Todavía no hay comisiones.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {comisiones.map((comision) => {
            const integrantes = comision.comision_miembros ?? []
            const yaEstan = new Set(integrantes.map((i) => i.perfil_id))
            return (
              <li key={comision.id}>
                <Tarjeta className="h-full space-y-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="font-titulo text-lg">{comision.nombre}</h2>
                      {comision.ve_economia && (
                        <span className="rounded-full bg-ocre-100 px-2.5 py-0.5 text-xs text-ocre-700">
                          Ve el panel económico
                        </span>
                      )}
                    </div>
                    {comision.descripcion && (
                      <p className="text-sm text-texto-suave">{comision.descripcion}</p>
                    )}
                  </div>

                  {integrantes.length === 0 ? (
                    <p className="text-sm text-texto-suave">Sin integrantes todavía.</p>
                  ) : (
                    <ul className="space-y-1">
                      {integrantes.map((i) => (
                        <li key={i.id} className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-sm">
                            {i.perfiles?.nombre_completo ?? 'Sin nombre'}
                            {i.coordina && <span className="text-texto-suave"> · coordina</span>}
                          </span>
                          <BotonAccion accion={quitarIntegrante.bind(null, ctx, i.id)} variante="fantasma">
                            Quitar
                          </BotonAccion>
                        </li>
                      ))}
                    </ul>
                  )}

                  <PanelLateral
                    titulo="Sumar a la comisión"
                    descripcion={comision.nombre}
                    variante="suave"
                    disparador="Sumar a alguien"
                  >
                    <FormularioIntegrante
                      accion={sumarIntegrante.bind(null, ctx, comision.id)}
                      personas={personas.filter((p) => !yaEstan.has(p.id))}
                    />
                  </PanelLateral>
                </Tarjeta>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
