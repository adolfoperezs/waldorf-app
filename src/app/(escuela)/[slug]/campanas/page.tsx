import { Plus } from 'lucide-react'
import { cerrarCampana, crearCampana } from '@/features/economia/actions/economia'
import { FormularioCampana } from '@/features/economia/components/formularios'
import { BarraAvance } from '@/features/economia/components/vistas'
import { formatearDinero, formatearHoras } from '@/features/economia/lib/formato'
import {
  avanceDeCampanas,
  campanasDeEscuela,
  comisionesDeEscuela,
  misComisiones,
} from '@/features/economia/queries/economia'
import type { ContextoEscuela } from '@/features/ritmo/actions/contexto'
import { formatearRango } from '@/features/ritmo/lib/fechas'
import { anioActivo, epocasDeAnio } from '@/features/ritmo/queries/ritmo'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'
import { cn } from '@/shared/lib/utils'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { BotonAccion } from '@/shared/ui/boton-accion'
import { PanelLateral } from '@/shared/ui/panel-lateral'
import { Tarjeta } from '@/shared/ui/tarjeta'

/**
 * Campanas: recoleccion, ayuda o apoyo, ancladas a una epoca o a una
 * comision (DOMAIN §3). La meta y el avance son de toda la comunidad; lo
 * que dio cada familia, no (avance_de_campanas devuelve solo sumas).
 *
 * Las crean los gestores y los integrantes de la comision a la que
 * pertenecen (campanas_comision, 0003 H7).
 */
export default async function PaginaCampanas({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { escuela, esGestor } = await cargarEscuela(slug)

  const supabase = await crearClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [campanas, avance, comisiones, mias, anio] = await Promise.all([
    campanasDeEscuela(escuela.id),
    avanceDeCampanas(escuela.id),
    comisionesDeEscuela(escuela.id),
    user ? misComisiones(escuela.id, user.id) : Promise.resolve([]),
    anioActivo(escuela.id),
  ])
  const epocas = anio ? await epocasDeAnio(anio.id) : []

  const ctx: ContextoEscuela = {
    escuelaId: escuela.id,
    slug: escuela.slug,
    zonaHoraria: escuela.zona_horaria,
  }

  const idsMias = new Set(mias.map((c) => c.id))
  const puedeCrear = esGestor || mias.length > 0
  const nombreComision = new Map(comisiones.map((c) => [c.id, c.nombre]))
  const nombreEpoca = new Map(epocas.map((e) => [e.id, e.nombre]))

  const dinero = (n: number) => formatearDinero(n, escuela)
  const horas = (n: number) => formatearHoras(n, escuela.idioma)

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-titulo text-3xl">Campañas</h1>
          <p className="text-texto-suave">
            Lo que la comunidad junta entre todos, en dinero o en horas de trabajo.
          </p>
        </div>
        {puedeCrear && (
          <PanelLateral
            titulo="Nueva campaña"
            disparador={
              <>
                <Plus aria-hidden className="size-4" />
                Nueva campaña
              </>
            }
          >
            <FormularioCampana
              accion={crearCampana.bind(null, ctx, anio?.id ?? null)}
              comisiones={(esGestor ? comisiones : mias).map((c) => ({ id: c.id, nombre: c.nombre }))}
              epocas={epocas.map((e) => ({ id: e.id, nombre: e.nombre }))}
              comisionObligatoria={!esGestor}
            />
          </PanelLateral>
        )}
      </header>

      {campanas.length === 0 ? (
        <p className="text-texto-suave">Todavía no hay campañas.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {campanas.map((campana) => {
            const llevado = avance.get(campana.id)
            const llevadoDinero = Number(llevado?.dinero ?? 0)
            const llevadoHoras = Number(llevado?.horas ?? 0)
            const puedeCerrar =
              campana.activa &&
              (esGestor || (campana.comision_id !== null && idsMias.has(campana.comision_id)))

            return (
              <li key={campana.id}>
                <Tarjeta className={cn('h-full space-y-4', !campana.activa && 'opacity-70')}>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 className="font-titulo text-lg">{campana.nombre}</h2>
                      {!campana.activa && (
                        <span className="rounded-full bg-crema-200 px-2.5 py-0.5 text-xs text-texto-suave">
                          Cerrada
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-texto-suave">
                      {[
                        campana.comision_id && nombreComision.get(campana.comision_id),
                        campana.epoca_id && nombreEpoca.get(campana.epoca_id),
                        campana.inicio &&
                          campana.fin &&
                          formatearRango(campana.inicio, campana.fin, escuela.idioma),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {campana.descripcion && <p className="text-sm">{campana.descripcion}</p>}
                  </div>

                  {campana.meta_monto !== null && (
                    <div className="space-y-1.5">
                      <p className="text-sm">
                        {dinero(llevadoDinero)}
                        <span className="text-texto-suave"> de {dinero(Number(campana.meta_monto))}</span>
                      </p>
                      <BarraAvance
                        fraccion={Number(campana.meta_monto) ? llevadoDinero / Number(campana.meta_monto) : 0}
                        etiqueta={`${campana.nombre}: dinero`}
                      />
                    </div>
                  )}
                  {campana.meta_horas !== null && (
                    <div className="space-y-1.5">
                      <p className="text-sm">
                        {horas(llevadoHoras)}
                        <span className="text-texto-suave"> de {horas(Number(campana.meta_horas))}</span>
                      </p>
                      <BarraAvance
                        fraccion={Number(campana.meta_horas) ? llevadoHoras / Number(campana.meta_horas) : 0}
                        etiqueta={`${campana.nombre}: horas`}
                      />
                    </div>
                  )}

                  {puedeCerrar && (
                    <BotonAccion accion={cerrarCampana.bind(null, ctx, campana.id)} variante="fantasma">
                      Cerrar la campaña
                    </BotonAccion>
                  )}
                </Tarjeta>
              </li>
            )
          })}
        </ul>
      )}

      <p className="text-sm text-texto-suave">
        Las familias suman horas a una campaña desde &quot;Nuestro aporte&quot;. Los aportes en
        dinero los registra la administración.
      </p>
    </div>
  )
}
