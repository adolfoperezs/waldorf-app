import { Plus } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { familiasDeEscuela } from '@/features/comunidad/queries/comunidad'
import {
  actualizarTramo,
  anularAporte,
  cargarTramosDePlantilla,
  confirmarAporte,
  crearTramo,
  elegirComisionEconomia,
  guardarAcuerdo,
  registrarAporte,
} from '@/features/economia/actions/economia'
import {
  FormularioAcuerdo,
  FormularioAporte,
  FormularioComisionEconomia,
  FormularioTramo,
} from '@/features/economia/components/formularios'
import { AvanceALaFecha, BarraAvance } from '@/features/economia/components/vistas'
import {
  mesesDeFamilia,
  mesesDeResumen,
  mesesDelAnio,
  proyeccion,
  totalesALaFecha,
} from '@/features/economia/lib/cuentas'
import { formatearDinero, formatearHoras } from '@/features/economia/lib/formato'
import {
  acuerdosDeAnio,
  aportesDeAnio,
  campanasDeEscuela,
  comisionesDeEscuela,
  resumenEconomico,
  tramosDeAnio,
} from '@/features/economia/queries/economia'
import type { ContextoEscuela } from '@/features/ritmo/actions/contexto'
import { formatearDia, hoyEnEscuela } from '@/features/ritmo/lib/fechas'
import { anioActivo } from '@/features/ritmo/queries/ritmo'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'
import { clasesBoton } from '@/shared/ui/boton'
import { BotonAccion } from '@/shared/ui/boton-accion'
import { PanelLateral } from '@/shared/ui/panel-lateral'
import { Tarjeta } from '@/shared/ui/tarjeta'

/**
 * Economia, para la administracion: el resumen del anio, las horas por
 * confirmar, cada familia con su acuerdo y su avance, y los tramos.
 *
 * Solo administracion (acuerdos_select, aportes_select). Es la pantalla que
 * reemplaza la planilla de la Comision de Economia (ROADMAP, Fase 2).
 */
export default async function PaginaEconomia({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { escuela, esAdministracion } = await cargarEscuela(slug)
  if (!esAdministracion) notFound()

  const anio = await anioActivo(escuela.id)
  if (!anio) {
    return (
      <div className="space-y-4">
        <h1 className="font-titulo text-3xl">Economía</h1>
        <Tarjeta className="space-y-3">
          <p className="text-texto-suave">
            Los acuerdos y los aportes son de un año escolar. Activa uno primero.
          </p>
          <Link href={`/${slug}/anios`} className={clasesBoton('primario')}>
            Ir a Años
          </Link>
        </Tarjeta>
      </div>
    )
  }

  const ctx: ContextoEscuela = {
    escuelaId: escuela.id,
    slug: escuela.slug,
    zonaHoraria: escuela.zona_horaria,
  }
  const hoy = hoyEnEscuela(escuela.zona_horaria)

  const [tramos, acuerdos, aportes, familias, comisiones, campanas, resumen] = await Promise.all([
    tramosDeAnio(anio.id),
    acuerdosDeAnio(anio.id),
    aportesDeAnio(anio.id),
    familiasDeEscuela(escuela.id),
    comisionesDeEscuela(escuela.id),
    campanasDeEscuela(escuela.id),
    resumenEconomico(anio.id),
  ])

  const meses = mesesDelAnio(anio.inicio, anio.fin)
  const mesesEscuela = mesesDeResumen(resumen, hoy)
  const totales = totalesALaFecha(mesesEscuela)
  const proy = proyeccion(mesesEscuela)

  const acuerdoDe = new Map(acuerdos.map((a) => [a.familia_id, a]))
  const tramoDe = new Map(tramos.map((t) => [t.id, t]))
  const familiaDe = new Map(familias.map((f) => [f.id, f.nombre]))
  const porConfirmar = aportes.filter((a) => a.estado === 'registrado')

  const opcionesComision = comisiones.map((c) => ({ id: c.id, nombre: c.nombre }))
  const opcionesCampana = campanas
    .filter((c) => c.activa)
    .map((c) => ({ id: c.id, nombre: c.nombre }))
  const comisionPanel = comisiones.find((c) => c.ve_economia)

  const dinero = (n: number) => formatearDinero(n, escuela)
  const horas = (n: number) => formatearHoras(n, escuela.idioma)

  return (
    <div className="space-y-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-titulo text-3xl">Economía</h1>
          <p className="text-texto-suave">
            Año {anio.nombre}. Los acuerdos de cada familia y lo aportado, en dinero y
            en horas.
          </p>
        </div>
        <Link href={`/${slug}/panel-economico`} className={clasesBoton('suave')}>
          Panel de la comisión
        </Link>
      </header>

      <section className="space-y-4">
        <h2 className="font-titulo text-xl">Lo que va del año</h2>
        <AvanceALaFecha totales={totales} escuela={escuela} />
        <p className="text-sm text-texto-suave">
          Si desde ahora cada familia cumple su acuerdo, el año cierra con{' '}
          <strong className="text-texto">{dinero(proy.siSeCumpleDinero)}</strong> y{' '}
          <strong className="text-texto">{horas(proy.siSeCumpleHoras)}</strong>
          {proy.alRitmoActualDinero !== null && (
            <>
              . Al ritmo actual, con{' '}
              <strong className="text-texto">{dinero(proy.alRitmoActualDinero)}</strong>
            </>
          )}
          .
        </p>
      </section>

      {porConfirmar.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-titulo text-xl">Horas por confirmar</h2>
          <p className="text-sm text-texto-suave">
            Las registró cada familia. Confirmarlas las suma a su acuerdo.
          </p>
          <ul className="space-y-3">
            {porConfirmar.map((aporte) => (
              <li key={aporte.id}>
                <Tarjeta className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {familiaDe.get(aporte.familia_id) ?? 'Familia'} ·{' '}
                      {horas(Number(aporte.horas ?? 0))}
                    </p>
                    <p className="text-sm text-texto-suave">
                      {formatearDia(aporte.fecha, escuela.idioma)}
                      {aporte.descripcion ? ` · ${aporte.descripcion}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <BotonAccion
                      accion={confirmarAporte.bind(null, ctx, aporte.id)}
                      variante="primario"
                    >
                      Confirmar
                    </BotonAccion>
                    <BotonAccion accion={anularAporte.bind(null, ctx, aporte.id)} variante="fantasma">
                      Anular
                    </BotonAccion>
                  </div>
                </Tarjeta>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-titulo text-xl">Familias</h2>
        {familias.length === 0 ? (
          <p className="text-texto-suave">
            Todavía no hay familias.{' '}
            <Link href={`/${slug}/familias`} className="text-acento underline">
              Súmalas desde Familias
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-3">
            {familias.map((familia) => {
              const acuerdo = acuerdoDe.get(familia.id)
              const t = totalesALaFecha(
                mesesDeFamilia(
                  meses,
                  acuerdo ?? null,
                  aportes.filter((a) => a.familia_id === familia.id),
                  hoy,
                ),
              )
              const tramo = acuerdo?.tramo_id ? tramoDe.get(acuerdo.tramo_id) : undefined

              return (
                <li key={familia.id}>
                  <Tarjeta className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <Link
                          href={`/${slug}/economia/${familia.id}`}
                          className="font-titulo text-lg text-primario-oscuro underline decoration-crema-300 underline-offset-4"
                        >
                          {familia.nombre}
                        </Link>
                        <p className="text-sm text-texto-suave">
                          {acuerdo
                            ? `${tramo ? `${tramo.nombre} · ` : ''}${dinero(Number(acuerdo.monto_mensual))} y ${horas(Number(acuerdo.horas_mensuales))} al mes`
                            : 'Sin acuerdo para este año'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <PanelLateral
                          titulo={acuerdo ? 'Acuerdo' : 'Nuevo acuerdo'}
                          descripcion={`${familia.nombre} · año ${anio.nombre}`}
                          variante={acuerdo ? 'fantasma' : 'suave'}
                          disparador={acuerdo ? 'Acuerdo' : 'Crear acuerdo'}
                        >
                          <FormularioAcuerdo
                            accion={guardarAcuerdo.bind(null, ctx, anio.id, familia.id)}
                            tramos={tramos}
                            acuerdo={acuerdo}
                            inicioDelAnio={anio.inicio}
                          />
                        </PanelLateral>
                        <PanelLateral
                          titulo="Registrar un aporte"
                          descripcion={familia.nombre}
                          variante="suave"
                          disparador="Registrar aporte"
                        >
                          <FormularioAporte
                            accion={registrarAporte.bind(null, ctx, anio.id, familia.id)}
                            hoy={hoy}
                            comisiones={opcionesComision}
                            campanas={opcionesCampana}
                          />
                        </PanelLateral>
                      </div>
                    </div>

                    {acuerdo && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <p className="text-sm">
                            {dinero(t.aportadoDinero)}
                            <span className="text-texto-suave"> de {dinero(t.comprometidoDinero)}</span>
                          </p>
                          <BarraAvance
                            fraccion={t.comprometidoDinero ? t.aportadoDinero / t.comprometidoDinero : 1}
                            etiqueta={`${familia.nombre}: dinero a la fecha`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm">
                            {horas(t.aportadoHoras)}
                            <span className="text-texto-suave"> de {horas(t.comprometidoHoras)}</span>
                            {t.horasPorConfirmar > 0 && (
                              <span className="text-texto-suave">
                                {' '}
                                (+{horas(t.horasPorConfirmar)} por confirmar)
                              </span>
                            )}
                          </p>
                          <BarraAvance
                            fraccion={t.comprometidoHoras ? t.aportadoHoras / t.comprometidoHoras : 1}
                            etiqueta={`${familia.nombre}: horas a la fecha`}
                          />
                        </div>
                      </div>
                    )}

                    {(t.porCompletarDinero > 0 || t.porCompletarHoras > 0) && (
                      <p className="text-sm text-atencion">
                        Por completar a la fecha:{' '}
                        {[
                          t.porCompletarDinero > 0 && dinero(t.porCompletarDinero),
                          t.porCompletarHoras > 0 && horas(t.porCompletarHoras),
                        ]
                          .filter(Boolean)
                          .join(' y ')}
                      </p>
                    )}
                  </Tarjeta>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-titulo text-xl">Tramos del aporte</h2>
          <PanelLateral
            titulo="Nuevo tramo"
            variante="fantasma"
            disparador={
              <>
                <Plus aria-hidden className="size-4" />
                Nuevo tramo
              </>
            }
          >
            <FormularioTramo accion={crearTramo.bind(null, ctx, anio.id)} />
          </PanelLateral>
        </div>
        <p className="text-sm text-texto-suave">
          El aporte es solidario: cada tramo sugiere un monto y unas horas, y el acuerdo
          de cada familia se conversa. Las familias ven los tramos, no el tramo de otras.
        </p>

        {tramos.length === 0 ? (
          <Tarjeta className="space-y-3">
            <p className="text-texto-suave">Este año todavía no tiene tramos.</p>
            <BotonAccion
              accion={cargarTramosDePlantilla.bind(null, ctx, anio.id)}
              variante="primario"
            >
              Cargar los tramos de la plantilla
            </BotonAccion>
          </Tarjeta>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {tramos.map((tramo) => (
              <li key={tramo.id}>
                <PanelLateral
                  titulo="Editar tramo"
                  descripcion={tramo.nombre}
                  variante="tarjeta"
                  claseDisparador="block w-full rounded-organico border border-borde bg-superficie p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-elevado"
                  etiquetaDisparador={`Editar ${tramo.nombre}`}
                  disparador={
                    <>
                      <span className="block font-titulo text-lg text-primario-oscuro">
                        {tramo.nombre}
                      </span>
                      <span className="block text-sm text-texto-suave">
                        {dinero(Number(tramo.monto_sugerido ?? 0))} y{' '}
                        {horas(Number(tramo.horas_sugeridas ?? 0))} al mes
                      </span>
                    </>
                  }
                >
                  <FormularioTramo accion={actualizarTramo.bind(null, ctx, tramo.id)} tramo={tramo} />
                </PanelLateral>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3 border-t border-borde pt-8">
        <h2 className="font-titulo text-xl">Quién ve el panel</h2>
        <p className="text-sm text-texto-suave">
          {comisionPanel
            ? `La comisión ${comisionPanel.nombre} ve los totales del año, sin el detalle de ninguna familia.`
            : 'Ninguna comisión ve el panel económico todavía.'}
        </p>
        <PanelLateral titulo="Panel económico" variante="suave" disparador="Elegir la comisión">
          <FormularioComisionEconomia
            accion={elegirComisionEconomia.bind(null, ctx)}
            comisiones={comisiones}
          />
        </PanelLateral>
      </section>
    </div>
  )
}
