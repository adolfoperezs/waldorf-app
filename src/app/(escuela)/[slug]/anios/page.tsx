import { Plus } from 'lucide-react'
import { notFound } from 'next/navigation'
import {
  activarAnio,
  cerrarAnio,
  crearAnio,
  materializarPlantilla,
} from '@/features/ritmo/actions/anio'
import type { ContextoEscuela } from '@/features/ritmo/actions/contexto'
import { FormularioAnio } from '@/features/ritmo/components/formulario-anio'
import { formatearDia } from '@/features/ritmo/lib/fechas'
import { aniosDeEscuela, epocasDeAnio } from '@/features/ritmo/queries/ritmo'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'
import { BotonAccion } from '@/shared/ui/boton-accion'
import { PanelLateral } from '@/shared/ui/panel-lateral'
import { Tarjeta } from '@/shared/ui/tarjeta'

export default async function PaginaAnios({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { escuela, esGestor } = await cargarEscuela(slug)

  // Esconder la pagina es cortesia, no seguridad: quien manda es la RLS. Si
  // una familia llega hasta aqui a mano, la base rechaza cada escritura.
  if (!esGestor) notFound()

  const ctx: ContextoEscuela = {
    escuelaId: escuela.id,
    slug: escuela.slug,
    zonaHoraria: escuela.zona_horaria,
  }

  const anios = await aniosDeEscuela(escuela.id)
  const epocasPorAnio = await Promise.all(
    anios.map(async (anio) => [anio.id, (await epocasDeAnio(anio.id)).length] as const),
  )
  const cuentaEpocas = new Map(epocasPorAnio)

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-titulo text-3xl">Años escolares</h1>
          <p className="text-texto-suave">
            Solo uno activo a la vez. De él cuelgan las épocas, las festividades y
            la minuta.
          </p>
        </div>
        <PanelLateral
          titulo="Nuevo año escolar"
          disparador={
            <>
              <Plus aria-hidden className="size-4" />
              Nuevo año
            </>
          }
        >
          <FormularioAnio accion={crearAnio.bind(null, ctx)} />
        </PanelLateral>
      </header>

      {anios.length === 0 ? (
        <p className="text-texto-suave">Todavía no hay ninguno.</p>
      ) : (
        <ul className="space-y-4">
          {anios.map((anio) => {
            const epocas = cuentaEpocas.get(anio.id) ?? 0
            return (
              <li key={anio.id}>
                <Tarjeta className="space-y-4">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="font-titulo text-lg">{anio.nombre}</h2>
                    {anio.activo && (
                      <span className="rounded-full bg-salvia-100 px-2.5 py-0.5 text-xs font-medium text-salvia-700">
                        Activo
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-texto-suave">
                    {formatearDia(anio.inicio, escuela.idioma)} a{' '}
                    {formatearDia(anio.fin, escuela.idioma)} · {epocas}{' '}
                    {epocas === 1 ? 'época' : 'épocas'}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    {anio.activo ? (
                      <BotonAccion accion={cerrarAnio.bind(null, ctx, anio.id)}>
                        Cerrar
                      </BotonAccion>
                    ) : (
                      <BotonAccion accion={activarAnio.bind(null, ctx, anio.id)}>
                        Activar
                      </BotonAccion>
                    )}

                    {epocas === 0 && (
                      <BotonAccion accion={materializarPlantilla.bind(null, ctx, anio.id)}>
                        Cargar la plantilla
                      </BotonAccion>
                    )}
                  </div>

                  {epocas === 0 && (
                    <p className="text-sm text-texto-suave">
                      Cargar la plantilla crea las épocas repartidas por el año, las
                      festividades que caen dentro y la minuta semanal. Es un punto
                      de partida: después se ajusta todo.
                    </p>
                  )}
                </Tarjeta>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
