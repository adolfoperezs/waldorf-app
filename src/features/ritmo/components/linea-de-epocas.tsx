import { dentroDe, formatearRango } from '../lib/fechas'
import type { Epoca } from '../queries/ritmo'

/**
 * Las epocas del anio en orden, marcando la que esta en curso.
 *
 * La epoca es el eje temporal del producto: contenidos, festividades, minuta,
 * jornadas y campanas cuelgan de ella (docs/DOMAIN.md).
 */
export function LineaDeEpocas({
  epocas,
  hoy,
  idioma = 'es',
  conAnio = false,
}: {
  epocas: Epoca[]
  hoy: string
  idioma?: string
  /** El anio lectivo cruza el cambio de anio civil (hemisferio norte). */
  conAnio?: boolean
}) {
  if (epocas.length === 0) {
    return <p className="text-texto-suave">Todavía no hay épocas en este año.</p>
  }

  return (
    <ol className="space-y-3">
      {epocas.map((epoca) => {
        const enCurso = dentroDe(hoy, epoca.inicio, epoca.fin)
        const pasada = epoca.fin < hoy

        return (
          <li
            key={epoca.id}
            aria-current={enCurso ? 'date' : undefined}
            className={[
              'rounded-organico border p-4',
              enCurso
                ? 'border-tierra-400 bg-crema-100'
                : 'border-borde bg-superficie',
              pasada ? 'opacity-60' : '',
            ].join(' ')}
          >
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h3 className="font-titulo text-lg text-primario-oscuro">{epoca.nombre}</h3>
              {enCurso && (
                <span className="rounded-suave bg-tierra-500 px-2 py-0.5 text-xs text-crema-50">
                  En curso
                </span>
              )}
              {epoca.grupo_id === null ? null : (
                <span className="text-xs text-texto-suave">Solo un grupo</span>
              )}
            </div>

            <p className="mt-1 text-sm text-texto-suave">
              {formatearRango(epoca.inicio, epoca.fin, idioma, conAnio)}
            </p>

            {epoca.tema && <p className="mt-2 text-sm">{epoca.tema}</p>}
          </li>
        )
      })}
    </ol>
  )
}
