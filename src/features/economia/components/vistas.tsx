import { cn } from '@/shared/lib/utils'
import { estadoDelMes, type Mes, type Totales } from '../lib/cuentas'
import { formatearDinero, formatearHoras, nombreDelMes } from '../lib/formato'

/**
 * Vistas de economia: el avance de un acuerdo y el mes a mes.
 *
 * Siempre las dos monedas juntas (DOMAIN §1). Lo que falta va en ocre y se
 * llama "por completar": nunca rojo, nunca "deuda".
 */

type Escuela = { idioma: string; pais: string; moneda: string }

/** Barra de avance tenue. `fraccion` entre 0 y 1; mas de 1 se muestra llena. */
export function BarraAvance({
  fraccion,
  etiqueta,
  className,
}: {
  fraccion: number
  etiqueta: string
  className?: string
}) {
  const ancho = Math.round(Math.min(1, Math.max(0, fraccion)) * 100)
  return (
    <div
      role="progressbar"
      aria-label={etiqueta}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={ancho}
      className={cn('h-2 overflow-hidden rounded-full bg-crema-200', className)}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-700',
          fraccion >= 1 ? 'bg-salvia-500' : 'bg-ocre-500',
        )}
        style={{ width: `${ancho}%` }}
      />
    </div>
  )
}

const fraccion = (aportado: number, comprometido: number) =>
  comprometido > 0 ? aportado / comprometido : aportado > 0 ? 1 : 0

/** Tarjeta de una moneda: lo aportado de lo comprometido, y lo por completar. */
export function IndicadorMoneda({
  titulo,
  aportado,
  comprometido,
  porCompletar,
  porConfirmar,
  formatear,
}: {
  titulo: string
  aportado: number
  comprometido: number
  porCompletar: number
  porConfirmar?: number
  formatear: (n: number) => string
}) {
  return (
    <div className="space-y-3 rounded-organico border border-borde bg-superficie p-5 shadow-reposo">
      <p className="text-xs font-semibold tracking-wide text-texto-suave uppercase">{titulo}</p>
      <p className="font-titulo text-2xl text-primario-oscuro">
        {formatear(aportado)}
        <span className="text-base text-texto-suave"> de {formatear(comprometido)}</span>
      </p>
      <BarraAvance fraccion={fraccion(aportado, comprometido)} etiqueta={`${titulo}: avance`} />
      <p className="text-sm">
        {porCompletar > 0 ? (
          <span className="text-atencion">Por completar: {formatear(porCompletar)}</span>
        ) : comprometido > 0 ? (
          <span className="text-exito">Al día</span>
        ) : (
          <span className="text-texto-suave">Sin acuerdo en esta moneda</span>
        )}
        {porConfirmar ? (
          <span className="text-texto-suave"> · {formatear(porConfirmar)} por confirmar</span>
        ) : null}
      </p>
    </div>
  )
}

/** Los dos indicadores de lo que va del anio. */
export function AvanceALaFecha({ totales, escuela }: { totales: Totales; escuela: Escuela }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <IndicadorMoneda
        titulo="Dinero a la fecha"
        aportado={totales.aportadoDinero}
        comprometido={totales.comprometidoDinero}
        porCompletar={totales.porCompletarDinero}
        formatear={(n) => formatearDinero(n, escuela)}
      />
      <IndicadorMoneda
        titulo="Horas a la fecha"
        aportado={totales.aportadoHoras}
        comprometido={totales.comprometidoHoras}
        porCompletar={totales.porCompletarHoras}
        porConfirmar={totales.horasPorConfirmar}
        formatear={(n) => formatearHoras(n, escuela.idioma)}
      />
    </div>
  )
}

const ETIQUETA_ESTADO = {
  'por-venir': { texto: 'Por venir', clase: 'bg-crema-100 text-texto-suave' },
  completo: { texto: 'Completo', clase: 'bg-salvia-100 text-salvia-700' },
  'por-completar': { texto: 'Por completar', clase: 'bg-ocre-100 text-ocre-700' },
  'sin-acuerdo': { texto: 'Sin acuerdo', clase: 'bg-crema-100 text-texto-suave' },
} as const

/** El mes a mes, en las dos monedas. En el telefono, una tarjeta por mes. */
export function TablaMeses({
  meses,
  escuela,
  conAnio = false,
}: {
  meses: Mes[]
  escuela: Escuela
  conAnio?: boolean
}) {
  const dinero = (n: number) => formatearDinero(n, escuela)
  const horas = (n: number) => formatearHoras(n, escuela.idioma)

  return (
    <ol className="divide-y divide-borde rounded-organico border border-borde bg-superficie">
      {meses.map((mes) => {
        const estado = ETIQUETA_ESTADO[estadoDelMes(mes)]
        return (
          <li
            key={mes.periodo}
            className={cn(
              'grid gap-2 p-4 sm:grid-cols-[8rem_1fr_1fr_7rem] sm:items-center',
              !mes.iniciado && 'opacity-60',
            )}
          >
            <span className="font-titulo text-primario-oscuro">
              {nombreDelMes(mes.periodo, escuela.idioma, conAnio)}
            </span>
            <span className="text-sm">
              <span className="text-texto-suave sm:hidden">Dinero: </span>
              {dinero(mes.aportadoDinero)}
              {mes.comprometidoDinero > 0 && (
                <span className="text-texto-suave"> de {dinero(mes.comprometidoDinero)}</span>
              )}
            </span>
            <span className="text-sm">
              <span className="text-texto-suave sm:hidden">Horas: </span>
              {horas(mes.aportadoHoras)}
              {mes.comprometidoHoras > 0 && (
                <span className="text-texto-suave"> de {horas(mes.comprometidoHoras)}</span>
              )}
              {mes.horasPorConfirmar > 0 && (
                <span className="text-texto-suave"> (+{horas(mes.horasPorConfirmar)} por confirmar)</span>
              )}
            </span>
            <span
              className={cn(
                'justify-self-start rounded-full px-2.5 py-0.5 text-xs font-medium sm:justify-self-end',
                estado.clase,
              )}
            >
              {estado.texto}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
