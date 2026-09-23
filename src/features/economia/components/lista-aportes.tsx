import { formatearDia } from '@/features/ritmo/lib/fechas'
import { cn } from '@/shared/lib/utils'
import { formatearDinero, formatearHoras, nombreDelMes } from '../lib/formato'
import type { Aporte } from '../queries/economia'

type Escuela = { idioma: string; pais: string; moneda: string }

const ESTADO = {
  registrado: { texto: 'Por confirmar', clase: 'bg-ocre-100 text-ocre-700' },
  confirmado: { texto: 'Confirmado', clase: 'bg-salvia-100 text-salvia-700' },
  anulado: { texto: 'Anulado', clase: 'bg-crema-200 text-texto-suave line-through' },
} as const

/**
 * Los aportes de una familia, del mas reciente al mas antiguo. `acciones`
 * pone al lado de cada uno lo que quien mira puede hacer (confirmar, anular,
 * retirar); la lista no decide permisos.
 */
export function ListaAportes({
  aportes,
  escuela,
  acciones,
}: {
  aportes: Aporte[]
  escuela: Escuela
  acciones?: (aporte: Aporte) => React.ReactNode
}) {
  if (aportes.length === 0) {
    return <p className="text-texto-suave">Todavía no hay aportes registrados este año.</p>
  }

  return (
    <ul className="divide-y divide-borde rounded-organico border border-borde bg-superficie">
      {aportes.map((aporte) => {
        const estado = ESTADO[aporte.estado]
        return (
          <li
            key={aporte.id}
            className={cn(
              'flex flex-wrap items-center justify-between gap-3 p-4',
              aporte.estado === 'anulado' && 'opacity-60',
            )}
          >
            <div className="space-y-0.5">
              <p className="font-medium">
                {aporte.moneda === 'dinero'
                  ? formatearDinero(Number(aporte.monto ?? 0), escuela)
                  : formatearHoras(Number(aporte.horas ?? 0), escuela.idioma)}
                <span className={cn('ml-2 rounded-full px-2 py-0.5 text-xs font-medium', estado.clase)}>
                  {estado.texto}
                </span>
              </p>
              <p className="text-sm text-texto-suave">
                {formatearDia(aporte.fecha, escuela.idioma)}
                {aporte.periodo ? ` · cuenta para ${nombreDelMes(aporte.periodo, escuela.idioma).toLowerCase()}` : ''}
                {aporte.descripcion ? ` · ${aporte.descripcion}` : ''}
              </p>
            </div>
            {acciones?.(aporte)}
          </li>
        )
      })}
    </ul>
  )
}
