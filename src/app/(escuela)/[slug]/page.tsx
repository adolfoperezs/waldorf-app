import Link from 'next/link'
import { LineaDeEpocas } from '@/features/ritmo/components/linea-de-epocas'
import { MinutaSemanal } from '@/features/ritmo/components/minuta-semanal'
import {
  cruzaAnioCivil,
  diaSemanaEnEscuela,
  formatearDia,
  formatearInstante,
  hoyEnEscuela,
} from '@/features/ritmo/lib/fechas'
import { calendario } from '@/features/ritmo/queries/ritmo'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'
import { Boton } from '@/shared/ui/boton'
import { Tarjeta } from '@/shared/ui/tarjeta'

/**
 * El calendario de la escuela. Es la pantalla mas usada del sistema y su
 * lector tipico es un apoderado en un telefono de gama media con mala senal:
 * movil primero, una columna, sin adornos.
 */
export default async function PaginaCalendario({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { escuela, esGestor } = await cargarEscuela(slug)
  const { anio, epocas, epocaEnCurso, festividades, eventos, minuta } =
    await calendario(escuela)

  const hoy = hoyEnEscuela(escuela.zona_horaria)
  const diaDeHoy = diaSemanaEnEscuela(escuela.zona_horaria)

  if (!anio) {
    return (
      <div className="space-y-6">
        <h1 className="font-titulo text-3xl text-tierra-800">{escuela.nombre}</h1>
        <Tarjeta className="space-y-4">
          <p className="text-texto-suave">
            Todavia no hay un anio escolar activo. El calendario, las epocas y
            las festividades cuelgan de el.
          </p>
          {esGestor && (
            <Link href={`/${slug}/anios`}>
              <Boton>Crear el anio escolar</Boton>
            </Link>
          )}
        </Tarjeta>
      </div>
    )
  }

  // Un anio lectivo del hemisferio norte va de septiembre a junio: sin el anio
  // civil, "5 de abril" despues de "1 de diciembre" parece un error de orden.
  const conAnio = cruzaAnioCivil(anio.inicio, anio.fin)

  const proximasFestividades = festividades.filter((f) => f.fecha >= hoy).slice(0, 5)

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="font-titulo text-3xl text-tierra-800">{escuela.nombre}</h1>
        <p className="text-texto-suave">Anio {anio.nombre}</p>
      </header>

      {epocaEnCurso && (
        <section className="space-y-4">
          <h2 className="font-titulo text-xl text-tierra-700">Ahora</h2>
          <Tarjeta className="space-y-4">
            <div>
              <p className="font-titulo text-2xl text-tierra-800">
                {epocaEnCurso.nombre}
              </p>
              <p className="text-sm text-texto-suave">
                Hasta el{' '}
                {formatearDia(
                  epocaEnCurso.fin,
                  escuela.idioma,
                  { day: 'numeric', month: 'long' },
                  conAnio,
                )}
              </p>
              {epocaEnCurso.tema && <p className="mt-2">{epocaEnCurso.tema}</p>}
            </div>

            <div className="border-t border-borde pt-4">
              <h3 className="mb-2 text-sm text-texto-suave">Minuta de la epoca</h3>
              <MinutaSemanal minuta={minuta} diaDeHoy={diaDeHoy} />
            </div>
          </Tarjeta>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-titulo text-xl text-tierra-700">Proximos encuentros</h2>
          <Link href={`/${slug}/eventos`} className="text-sm text-acento underline">
            Ver todos
          </Link>
        </div>

        {eventos.length === 0 ? (
          <p className="text-texto-suave">No hay encuentros agendados.</p>
        ) : (
          <ul className="space-y-3">
            {eventos.map((evento) => (
              <li key={evento.id}>
                <Link
                  href={`/${slug}/eventos/${evento.id}`}
                  className="block rounded-organico border border-borde bg-superficie p-4 hover:bg-crema-100"
                >
                  <p className="font-medium">{evento.titulo}</p>
                  <p className="text-sm text-texto-suave">
                    {formatearInstante(
                      evento.inicio,
                      escuela.zona_horaria,
                      escuela.idioma,
                    )}
                    {evento.lugar ? ` · ${evento.lugar}` : ''}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {proximasFestividades.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-titulo text-xl text-tierra-700">Festividades</h2>
          <ul className="divide-y divide-borde">
            {proximasFestividades.map((festividad) => (
              <li
                key={festividad.id}
                className="flex flex-wrap items-baseline justify-between gap-2 py-3"
              >
                <span>{festividad.nombre}</span>
                <span className="text-sm text-texto-suave">
                  {formatearDia(
                    festividad.fecha,
                    escuela.idioma,
                    { day: 'numeric', month: 'long' },
                    conAnio,
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-titulo text-xl text-tierra-700">El anio</h2>
        <LineaDeEpocas
          epocas={epocas}
          hoy={hoy}
          idioma={escuela.idioma}
          conAnio={conAnio}
        />
      </section>
    </div>
  )
}
