import { notFound } from 'next/navigation'
import { AvanceALaFecha, BarraAvance } from '@/features/economia/components/vistas'
import { mesesDeResumen, proyeccion, totalesALaFecha } from '@/features/economia/lib/cuentas'
import {
  formatearDinero,
  formatearHoras,
  formatearPorcentaje,
  nombreDelMes,
} from '@/features/economia/lib/formato'
import { misComisiones, resumenEconomico } from '@/features/economia/queries/economia'
import { cruzaAnioCivil, hoyEnEscuela } from '@/features/ritmo/lib/fechas'
import { anioActivo } from '@/features/ritmo/queries/ritmo'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'
import { cn } from '@/shared/lib/utils'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { Tarjeta } from '@/shared/ui/tarjeta'

/**
 * El panel de la Comision de Economia (ROADMAP, Fase 2): agregados, brechas
 * y proyeccion. Sin el nombre de ninguna familia.
 *
 * La comision es mixta (familias y equipo). El dato economico de cada familia
 * es de la administracion y de la propia familia (docs/PRIVACY.md), asi que
 * aqui solo llegan sumas: resumen_economico no devuelve familias, y a quien
 * no ve economia no le devuelve nada.
 */
export default async function PaginaPanelEconomico({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { escuela, esAdministracion } = await cargarEscuela(slug)

  const supabase = await crearClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const comisiones = user ? await misComisiones(escuela.id, user.id) : []
  const comision = comisiones.find((c) => c.veEconomia)
  if (!esAdministracion && !comision) notFound()

  const anio = await anioActivo(escuela.id)
  if (!anio) {
    return (
      <div className="space-y-4">
        <h1 className="font-titulo text-3xl">Panel económico</h1>
        <p className="text-texto-suave">Todavía no hay un año escolar activo.</p>
      </div>
    )
  }

  const hoy = hoyEnEscuela(escuela.zona_horaria)
  const filas = await resumenEconomico(anio.id)
  const meses = mesesDeResumen(filas, hoy)
  const totales = totalesALaFecha(meses)
  const proy = proyeccion(meses)
  const conAnio = cruzaAnioCivil(anio.inicio, anio.fin)

  const dinero = (n: number) => formatearDinero(n, escuela)
  const horas = (n: number) => formatearHoras(n, escuela.idioma)
  const familiasConAcuerdo = Math.max(0, ...filas.map((f) => f.familias_con_acuerdo))

  return (
    <div className="space-y-10">
      <header className="space-y-1">
        <h1 className="font-titulo text-3xl">Panel económico</h1>
        <p className="text-texto-suave">
          Año {anio.nombre}
          {comision ? ` · Comisión ${comision.nombre}` : ''}. Totales de la escuela, sin
          el detalle de ninguna familia.
        </p>
      </header>

      <section className="space-y-4">
        <h2 className="font-titulo text-xl">Lo que va del año</h2>
        <AvanceALaFecha totales={totales} escuela={escuela} />
        <p className="text-sm text-texto-suave">
          {familiasConAcuerdo} {familiasConAcuerdo === 1 ? 'familia tiene' : 'familias tienen'}{' '}
          acuerdo este año.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="font-titulo text-xl">Proyección del año</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Tarjeta className="space-y-1">
            <p className="text-xs font-semibold tracking-wide text-texto-suave uppercase">
              Comprometido en el año
            </p>
            <p className="font-titulo text-xl text-primario-oscuro">{dinero(proy.comprometidoDinero)}</p>
            <p className="text-sm text-texto-suave">{horas(proy.comprometidoHoras)}</p>
          </Tarjeta>
          <Tarjeta className="space-y-1">
            <p className="text-xs font-semibold tracking-wide text-texto-suave uppercase">
              Si desde ahora se cumple
            </p>
            <p className="font-titulo text-xl text-primario-oscuro">{dinero(proy.siSeCumpleDinero)}</p>
            <p className="text-sm text-texto-suave">{horas(proy.siSeCumpleHoras)}</p>
          </Tarjeta>
          <Tarjeta className="space-y-1">
            <p className="text-xs font-semibold tracking-wide text-texto-suave uppercase">
              Al ritmo actual
            </p>
            <p className="font-titulo text-xl text-primario-oscuro">
              {proy.alRitmoActualDinero === null ? '—' : dinero(proy.alRitmoActualDinero)}
            </p>
            <p className="text-sm text-texto-suave">
              {proy.alRitmoActualHoras === null ? '—' : horas(proy.alRitmoActualHoras)} ·
              cumplimiento {formatearPorcentaje(proy.cumplimientoDinero)} en dinero y{' '}
              {formatearPorcentaje(proy.cumplimientoHoras)} en horas
            </p>
          </Tarjeta>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-titulo text-xl">Mes a mes</h2>
        <ol className="divide-y divide-borde rounded-organico border border-borde bg-superficie">
          {filas.map((fila, i) => {
            const mes = meses[i]
            const alDia = fila.familias_con_acuerdo
              ? fila.familias_al_dia / fila.familias_con_acuerdo
              : 0
            return (
              <li
                key={fila.periodo}
                className={cn(
                  'grid gap-2 p-4 sm:grid-cols-[8rem_1fr_1fr_12rem] sm:items-center',
                  !mes.iniciado && 'opacity-60',
                )}
              >
                <span className="font-titulo text-primario-oscuro">
                  {nombreDelMes(fila.periodo, escuela.idioma, conAnio)}
                </span>
                <span className="text-sm">
                  <span className="text-texto-suave sm:hidden">Dinero: </span>
                  {dinero(mes.aportadoDinero)}
                  <span className="text-texto-suave"> de {dinero(mes.comprometidoDinero)}</span>
                </span>
                <span className="text-sm">
                  <span className="text-texto-suave sm:hidden">Horas: </span>
                  {horas(mes.aportadoHoras)}
                  <span className="text-texto-suave"> de {horas(mes.comprometidoHoras)}</span>
                  {mes.horasPorConfirmar > 0 && (
                    <span className="text-texto-suave"> (+{horas(mes.horasPorConfirmar)} por confirmar)</span>
                  )}
                </span>
                <span className="space-y-1 text-sm">
                  {mes.iniciado ? (
                    <>
                      <span className="block">
                        {fila.familias_al_dia} de {fila.familias_con_acuerdo} familias al día
                      </span>
                      <BarraAvance fraccion={alDia} etiqueta="Familias al día" />
                    </>
                  ) : (
                    <span className="text-texto-suave">Por venir</span>
                  )}
                </span>
              </li>
            )
          })}
        </ol>
        <p className="text-sm text-texto-suave">
          Una familia está al día en un mes cuando lo aportado y confirmado cubre su
          acuerdo en dinero y en horas.
        </p>
      </section>
    </div>
  )
}
