import { NOMBRE_DIA } from '../lib/fechas'
import type { Minuta } from '../queries/ritmo'

/**
 * La minuta de la epoca en curso.
 *
 * Muchas escuelas Waldorf asocian cada dia a un cereal y a un ritmo semanal.
 * Cambia por epoca, no por mes.
 */
export function MinutaSemanal({
  minuta,
  diaDeHoy,
}: {
  minuta: Minuta[]
  diaDeHoy: number
}) {
  if (minuta.length === 0) {
    return <p className="text-texto-suave">Esta época no tiene minuta cargada.</p>
  }

  return (
    <ul className="divide-y divide-borde">
      {minuta.map((dia) => {
        const esHoy = dia.dia_semana === diaDeHoy
        return (
          <li
            key={dia.id}
            className={[
              'flex flex-wrap items-baseline justify-between gap-2 py-2.5',
              esHoy ? 'font-medium' : '',
            ].join(' ')}
          >
            <span className="text-sm text-texto-suave">
              {NOMBRE_DIA[dia.dia_semana - 1]}
              {esHoy && <span className="ml-2 text-acento">hoy</span>}
            </span>
            <span>{dia.plato}</span>
          </li>
        )
      })}
    </ul>
  )
}
