import { clasesAcento } from '@/shared/design/acentos'
import { cn } from '@/shared/lib/utils'
import { avanceDeEpoca, formatearDia } from '../lib/fechas'
import type { Epoca } from '../queries/ritmo'

/**
 * La epoca activa con su avance semanal (lineamiento, 3.1, basica y media).
 * Solo para grupos escolares: en jardin no hay epocas academicas.
 */
export function BannerEpoca({
  epoca,
  hoy,
  idioma,
  acento,
  tema,
}: {
  epoca: Epoca
  hoy: string
  idioma: string
  acento: string | null | undefined
  /** El tema de la semana que escribio la maestra, si lo hay. */
  tema?: string | null
}) {
  const clases = clasesAcento(acento)
  const { semana, semanas, fraccion } = avanceDeEpoca(epoca.inicio, epoca.fin, hoy)

  return (
    <section
      aria-label="Época activa"
      className={cn('space-y-3 rounded-organico border-l-4 p-5', clases.borde, clases.fondo)}
    >
      <p className={cn('text-xs font-semibold tracking-wide uppercase', clases.texto)}>
        Época activa
      </p>
      <p className="font-titulo text-2xl text-primario-oscuro">{epoca.nombre}</p>
      {epoca.tema && <p className="text-sm">{epoca.tema}</p>}

      <div className="space-y-1.5">
        <div
          role="progressbar"
          aria-label="Avance de la época"
          aria-valuemin={1}
          aria-valuemax={semanas}
          aria-valuenow={semana}
          aria-valuetext={`Semana ${semana} de ${semanas}`}
          className="h-2 overflow-hidden rounded-full bg-superficie"
        >
          <div
            className={cn('h-full rounded-full transition-[width] duration-700', clases.relleno)}
            style={{ width: `${Math.round(fraccion * 100)}%` }}
          />
        </div>
        <p className="text-sm text-texto-suave">
          Semana {semana} de {semanas} · hasta el{' '}
          {formatearDia(epoca.fin, idioma, { day: 'numeric', month: 'long' })}
        </p>
      </div>

      {tema && (
        <p className="border-t border-borde/60 pt-3">
          <span className="block text-xs text-texto-suave">Tema de la semana</span>
          {tema}
        </p>
      )}
    </section>
  )
}
