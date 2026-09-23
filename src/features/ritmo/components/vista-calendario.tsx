import Link from 'next/link'
import { clasesBoton } from '@/shared/ui/boton'
import { Tarjeta } from '@/shared/ui/tarjeta'
import {
  cruzaAnioCivil,
  diaSemanaEnEscuela,
  formatearDia,
  formatearInstante,
  hoyEnEscuela,
} from '../lib/fechas'
import { calendario } from '../queries/ritmo'
import { LineaDeEpocas } from './linea-de-epocas'
import { MinutaSemanal } from './minuta-semanal'

type Escuela = {
  id: string
  slug: string
  nombre: string
  idioma: string
  zona_horaria: string
}

/**
 * El calendario de toda la escuela: la epoca en curso, lo que viene, las
 * festividades y el anio completo. Movil primero, una columna, sin adornos.
 *
 * Vive en /[slug]/calendario para todos, y es la portada de quien no tiene
 * hijos en la escuela (el equipo).
 */
export async function VistaCalendario({
  escuela,
  esGestor,
  accesoMiCurso,
}: {
  escuela: Escuela
  esGestor: boolean
  /** Atajo al ritmo semanal para quien tiene grupos a cargo. */
  accesoMiCurso?: boolean
}) {
  const { slug } = escuela
  const { anio, epocas, epocaEnCurso, festividades, eventos, minuta } =
    await calendario(escuela)

  const hoy = hoyEnEscuela(escuela.zona_horaria)
  const diaDeHoy = diaSemanaEnEscuela(escuela.zona_horaria)

  const atajo = accesoMiCurso && (
    <Tarjeta className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="font-titulo text-lg text-primario-oscuro">Mi curso</p>
        <p className="text-sm text-texto-suave">
          Carga el ritmo de la semana y publícalo para las familias.
        </p>
      </div>
      <Link href={`/${slug}/ritmo`} className={clasesBoton('primario')}>
        Ir al ritmo semanal
      </Link>
    </Tarjeta>
  )

  if (!anio) {
    return (
      <div className="space-y-6">
        <h1 className="font-titulo text-3xl">{escuela.nombre}</h1>
        {atajo}
        <Tarjeta className="space-y-4">
          <p className="text-texto-suave">
            Todavía no hay un año escolar activo. El calendario, las épocas y
            las festividades cuelgan de él.
          </p>
          {esGestor && (
            <Link href={`/${slug}/anios`} className={clasesBoton('primario')}>
              Crear el año escolar
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
        <h1 className="font-titulo text-3xl">{escuela.nombre}</h1>
        <p className="text-texto-suave">Año {anio.nombre}</p>
      </header>

      {atajo}

      {epocaEnCurso && (
        <section className="space-y-4">
          <h2 className="font-titulo text-xl">Ahora</h2>
          <Tarjeta className="space-y-4">
            <div>
              <p className="font-titulo text-2xl text-primario-oscuro">
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
              <h3 className="mb-2 text-sm text-texto-suave">Minuta de la época</h3>
              <MinutaSemanal minuta={minuta} diaDeHoy={diaDeHoy} />
            </div>
          </Tarjeta>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-titulo text-xl">Próximos encuentros</h2>
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
                  className="block rounded-organico border border-borde bg-superficie p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-elevado"
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
          <h2 className="font-titulo text-xl">Festividades</h2>
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
        <h2 className="font-titulo text-xl">El año</h2>
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
