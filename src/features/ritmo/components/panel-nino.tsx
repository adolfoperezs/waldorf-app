import { Backpack, Megaphone, Sprout } from 'lucide-react'
import Link from 'next/link'
import type { GrupoConCiclo } from '@/features/comunidad/queries/comunidad'
import { clasesAcento } from '@/shared/design/acentos'
import { cn } from '@/shared/lib/utils'
import { Tarjeta } from '@/shared/ui/tarjeta'
import { formatearDia, formatearInstante, NOMBRE_DIA } from '../lib/fechas'
import type { DiaDeRitmo, RitmoSemanal } from '../queries/ritmo-semanal'
import type { Epoca } from '../queries/ritmo'
import { BannerEpoca } from './banner-epoca'
import { TarjetaDia } from './tarjeta-dia'
import { DiaDeLaTira, TiraDeDias } from './tira-de-dias'

type Escuela = { slug: string; idioma: string; zona_horaria: string }

/**
 * El ritmo de UN nino, segun su ciclo (lineamiento, 3.1).
 *
 * Jardin: el cuento de la semana, el cereal y la actividad del dia, y lo que
 * hay que llevar. Cero mencion a asignaturas o epocas academicas.
 *
 * Escolar: la epoca activa con su avance, la clase principal y las materias
 * del dia, y los avisos del curso.
 */
export function PanelNino({
  nombre,
  grupo,
  ritmo,
  dias,
  epoca,
  eventos,
  hoy,
  esProximaSemana,
  rangoSemana,
  escuela,
}: {
  nombre: string
  grupo: GrupoConCiclo | null
  ritmo: RitmoSemanal | undefined
  dias: DiaDeRitmo[]
  epoca: Epoca | null
  eventos: { id: string; titulo: string; inicio: string; lugar: string | null }[]
  hoy: string
  esProximaSemana: boolean
  rangoSemana: string
  escuela: Escuela
}) {
  if (!grupo) {
    return (
      <Tarjeta>
        <p className="text-texto-suave">
          {nombre} todavía no tiene grupo asignado. Cuando la escuela lo asigne,
          aquí vas a ver su ritmo de cada semana.
        </p>
      </Tarjeta>
    )
  }

  const modalidad = grupo.ciclo?.modalidad ?? 'escolar'
  const acento = clasesAcento(grupo.ciclo?.acento)
  const diaDeHoy = dias.find((d) => d.fecha === hoy)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-texto-suave">
          {grupo.nombre}
          {grupo.ciclo ? ` · ${grupo.ciclo.nombre}` : ''}
        </p>
        {diaDeHoy ? (
          <p className="font-titulo text-xl text-primario-oscuro">
            Hoy es {NOMBRE_DIA[diaDeHoy.dia - 1].toLowerCase()}
            {diaDeHoy.alimento && (
              <span className="text-texto-suave"> · Cereal del día: {diaDeHoy.alimento}</span>
            )}
          </p>
        ) : (
          <p className="font-titulo text-xl text-primario-oscuro">
            {esProximaSemana ? 'La semana que viene' : 'Esta semana'}
          </p>
        )}
      </div>

      {modalidad === 'jardin' ? (
        <section
          aria-label="Cuento de la semana"
          className={cn('space-y-2 rounded-organico p-5', acento.fondo)}
        >
          <p className={cn('flex items-center gap-2 text-xs font-semibold tracking-wide uppercase', acento.texto)}>
            <Sprout aria-hidden className="size-4" />
            Cuento de la semana
          </p>
          <p className="font-titulo text-2xl text-primario-oscuro">
            {ritmo?.tema ?? (ritmo ? 'Una semana de juego y ritmo' : 'Pronto')}
          </p>
          {!ritmo && (
            <p className="text-sm text-texto-suave">
              La maestra todavía no publica el ritmo de esta semana.
            </p>
          )}
        </section>
      ) : epoca ? (
        <BannerEpoca
          epoca={epoca}
          hoy={hoy < epoca.inicio ? epoca.inicio : hoy}
          idioma={escuela.idioma}
          acento={grupo.ciclo?.acento}
          tema={ritmo?.tema}
        />
      ) : (
        ritmo?.tema && (
          <Tarjeta>
            <p className="text-xs text-texto-suave">Tema de la semana</p>
            <p className="font-titulo text-xl text-primario-oscuro">{ritmo.tema}</p>
          </Tarjeta>
        )
      )}

      <section aria-label={`Ritmo de la semana del ${rangoSemana}`} className="space-y-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-titulo text-lg">Ritmo de la semana</h3>
          <p className="text-sm text-texto-suave">{rangoSemana}</p>
        </div>

        {modalidad === 'escolar' && !ritmo && (
          <p className="text-sm text-texto-suave">
            La maestra todavía no publica el ritmo de esta semana. Mientras, está
            la minuta de la escuela.
          </p>
        )}

        <TiraDeDias>
          {dias.map((d) => (
            <DiaDeLaTira key={d.dia} esHoy={d.fecha === hoy}>
              <TarjetaDia
                nombreDia={NOMBRE_DIA[d.dia - 1]}
                fecha={formatearDia(d.fecha, escuela.idioma, { day: 'numeric', month: 'short' })}
                esHoy={d.fecha === hoy}
                alimento={d.alimento}
                actividad={d.registro?.actividad ?? null}
                materias={d.registro?.materias ?? []}
                nota={d.registro?.nota ?? null}
                modalidad={modalidad}
              />
            </DiaDeLaTira>
          ))}
        </TiraDeDias>
      </section>

      {ritmo?.recordatorio && (
        <Tarjeta className="flex gap-3">
          <Backpack aria-hidden className={cn('mt-0.5 size-5 shrink-0', acento.texto)} />
          <div>
            <p className="text-xs text-texto-suave">
              {modalidad === 'jardin' ? 'Para llevar y recordar' : 'Recordatorio'}
            </p>
            <p>{ritmo.recordatorio}</p>
          </div>
        </Tarjeta>
      )}

      {eventos.length > 0 && (
        <section aria-label="Avisos del curso" className="space-y-3">
          <h3 className="flex items-center gap-2 font-titulo text-lg">
            <Megaphone aria-hidden className={cn('size-4', acento.texto)} />
            Avisos del curso
          </h3>
          <ul className="space-y-2">
            {eventos.map((evento) => (
              <li key={evento.id}>
                <Link
                  href={`/${escuela.slug}/eventos/${evento.id}`}
                  className="block rounded-organico border border-borde bg-superficie p-4 transition hover:-translate-y-0.5 hover:shadow-elevado"
                >
                  <p className="font-medium">{evento.titulo}</p>
                  <p className="text-sm text-texto-suave">
                    {formatearInstante(evento.inicio, escuela.zona_horaria, escuela.idioma)}
                    {evento.lugar ? ` · ${evento.lugar}` : ''}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
