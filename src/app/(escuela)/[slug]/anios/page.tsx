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
      <header className="space-y-1">
        <h1 className="font-titulo text-3xl text-tierra-800">Anios escolares</h1>
        <p className="text-texto-suave">
          Solo uno activo a la vez. De el cuelgan las epocas, las festividades y
          la minuta.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-titulo text-xl text-tierra-700">Crear un anio</h2>
        <Tarjeta>
          <FormularioAnio accion={crearAnio.bind(null, ctx)} />
        </Tarjeta>
      </section>

      <section className="space-y-4">
        <h2 className="font-titulo text-xl text-tierra-700">Los anios</h2>

        {anios.length === 0 ? (
          <p className="text-texto-suave">Todavia no hay ninguno.</p>
        ) : (
          <ul className="space-y-4">
            {anios.map((anio) => {
              const epocas = cuentaEpocas.get(anio.id) ?? 0
              return (
                <li key={anio.id}>
                  <Tarjeta className="space-y-4">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h3 className="font-titulo text-lg text-tierra-800">
                        {anio.nombre}
                      </h3>
                      {anio.activo && (
                        <span className="rounded-suave bg-tierra-500 px-2 py-0.5 text-xs text-crema-50">
                          Activo
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-texto-suave">
                      {formatearDia(anio.inicio, escuela.idioma)} a{' '}
                      {formatearDia(anio.fin, escuela.idioma)} · {epocas}{' '}
                      {epocas === 1 ? 'epoca' : 'epocas'}
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
                        <BotonAccion
                          accion={materializarPlantilla.bind(null, ctx, anio.id)}
                        >
                          Cargar la plantilla
                        </BotonAccion>
                      )}
                    </div>

                    {epocas === 0 && (
                      <p className="text-sm text-texto-suave">
                        Cargar la plantilla crea las epocas repartidas por el
                        anio, las festividades que caen dentro y la minuta
                        semanal. Es un punto de partida: despues se ajusta todo.
                      </p>
                    )}
                  </Tarjeta>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
