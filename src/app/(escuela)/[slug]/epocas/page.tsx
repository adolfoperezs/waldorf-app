import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ContextoEscuela } from '@/features/ritmo/actions/contexto'
import { crearEpoca, eliminarEpoca } from '@/features/ritmo/actions/epoca'
import { FormularioEpoca } from '@/features/ritmo/components/formulario-epoca'
import { cruzaAnioCivil, formatearRango, hoyEnEscuela } from '@/features/ritmo/lib/fechas'
import { gruposDeEscuela } from '@/features/ritmo/queries/grupos'
import { anioActivo, epocasDeAnio } from '@/features/ritmo/queries/ritmo'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'
import { BotonAccion } from '@/shared/ui/boton-accion'
import { Tarjeta } from '@/shared/ui/tarjeta'

export default async function PaginaEpocas({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { escuela, esGestor } = await cargarEscuela(slug)
  if (!esGestor) notFound()

  const anio = await anioActivo(escuela.id)

  if (!anio) {
    return (
      <div className="space-y-4">
        <h1 className="font-titulo text-3xl text-tierra-800">Epocas</h1>
        <p className="text-texto-suave">
          Las epocas cuelgan de un anio escolar. Activa uno primero.
        </p>
      </div>
    )
  }

  const ctx: ContextoEscuela = {
    escuelaId: escuela.id,
    slug: escuela.slug,
    zonaHoraria: escuela.zona_horaria,
  }

  const [epocas, grupos] = await Promise.all([
    epocasDeAnio(anio.id),
    gruposDeEscuela(escuela.id),
  ])

  const hoy = hoyEnEscuela(escuela.zona_horaria)
  const conAnio = cruzaAnioCivil(anio.inicio, anio.fin)
  const siguienteOrden =
    epocas.reduce((mayor, epoca) => Math.max(mayor, epoca.orden), 0) + 1

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="font-titulo text-3xl text-tierra-800">Epocas</h1>
        <p className="text-texto-suave">
          Anio {anio.nombre}. Las de un mismo grupo no se pueden solapar, y la
          base de datos lo impide.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-titulo text-xl text-tierra-700">Nueva epoca</h2>
        <Tarjeta>
          <FormularioEpoca
            accion={crearEpoca.bind(null, ctx)}
            anioId={anio.id}
            grupos={grupos}
            ordenSugerido={siguienteOrden}
          />
        </Tarjeta>
      </section>

      <section className="space-y-4">
        <h2 className="font-titulo text-xl text-tierra-700">
          {epocas.length} {epocas.length === 1 ? 'epoca' : 'epocas'}
        </h2>

        {epocas.length === 0 ? (
          <p className="text-texto-suave">
            Ninguna todavia. Puedes cargar la plantilla desde la pagina de anios.
          </p>
        ) : (
          <ul className="space-y-3">
            {epocas.map((epoca) => (
              <li key={epoca.id}>
                <Tarjeta className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <Link
                      href={`/${slug}/epocas/${epoca.id}`}
                      className="font-titulo text-lg text-tierra-800 underline decoration-crema-300 underline-offset-4"
                    >
                      {epoca.orden}. {epoca.nombre}
                    </Link>
                    <p className="text-sm text-texto-suave">
                      {formatearRango(epoca.inicio, epoca.fin, escuela.idioma, conAnio)}
                      {epoca.grupo_id ? ' · solo un grupo' : ''}
                      {epoca.inicio <= hoy && hoy <= epoca.fin ? ' · en curso' : ''}
                    </p>
                  </div>

                  <BotonAccion accion={eliminarEpoca.bind(null, ctx, epoca.id)}>
                    Quitar
                  </BotonAccion>
                </Tarjeta>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
