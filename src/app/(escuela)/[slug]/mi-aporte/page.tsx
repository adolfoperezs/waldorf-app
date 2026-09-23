import { Plus } from 'lucide-react'
import { notFound } from 'next/navigation'
import { registrarMisHoras, retirarMisHoras } from '@/features/economia/actions/economia'
import { FormularioMisHoras } from '@/features/economia/components/formularios'
import { ListaAportes } from '@/features/economia/components/lista-aportes'
import { AvanceALaFecha, TablaMeses } from '@/features/economia/components/vistas'
import { mesesDeFamilia, mesesDelAnio, totalesALaFecha } from '@/features/economia/lib/cuentas'
import { formatearDinero, formatearHoras } from '@/features/economia/lib/formato'
import {
  acuerdosDeAnio,
  aportesDeAnio,
  campanasDeEscuela,
  comisionesDeEscuela,
  miFamilia,
  tramosDeAnio,
} from '@/features/economia/queries/economia'
import type { ContextoEscuela } from '@/features/ritmo/actions/contexto'
import { cruzaAnioCivil, hoyEnEscuela } from '@/features/ritmo/lib/fechas'
import { anioActivo } from '@/features/ritmo/queries/ritmo'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { BotonAccion } from '@/shared/ui/boton-accion'
import { PanelLateral } from '@/shared/ui/panel-lateral'
import { Tarjeta } from '@/shared/ui/tarjeta'

/**
 * El aporte de la familia (ROADMAP, Fase 2): su acuerdo, lo aportado y lo
 * que queda por completar, mes a mes y en las dos monedas. Y el registro de
 * sus propias horas, que la administracion confirma.
 *
 * Lo que se ve lo decide la RLS: solo el acuerdo y los aportes de la propia
 * familia.
 */
export default async function PaginaMiAporte({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { escuela } = await cargarEscuela(slug)

  const supabase = await crearClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const [familia, anio] = await Promise.all([miFamilia(escuela.id, user.id), anioActivo(escuela.id)])
  if (!familia) notFound()

  if (!anio) {
    return (
      <div className="space-y-4">
        <h1 className="font-titulo text-3xl">Nuestro aporte</h1>
        <p className="text-texto-suave">La escuela todavía no abre el año escolar.</p>
      </div>
    )
  }

  const ctx: ContextoEscuela = {
    escuelaId: escuela.id,
    slug: escuela.slug,
    zonaHoraria: escuela.zona_horaria,
  }
  const hoy = hoyEnEscuela(escuela.zona_horaria)

  const [tramos, acuerdos, aportes, comisiones, campanas] = await Promise.all([
    tramosDeAnio(anio.id),
    acuerdosDeAnio(anio.id, familia.id),
    aportesDeAnio(anio.id, familia.id),
    comisionesDeEscuela(escuela.id),
    campanasDeEscuela(escuela.id),
  ])

  const acuerdo = acuerdos[0]
  const meses = mesesDeFamilia(mesesDelAnio(anio.inicio, anio.fin), acuerdo ?? null, aportes, hoy)
  const totales = totalesALaFecha(meses)
  const tramo = tramos.find((t) => t.id === acuerdo?.tramo_id)

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-titulo text-3xl">Nuestro aporte</h1>
          <p className="text-texto-suave">
            {familia.nombre} · año {anio.nombre}
          </p>
        </div>
        <PanelLateral
          titulo="Registrar horas"
          descripcion="El trabajo comunitario también es aporte."
          disparador={
            <>
              <Plus aria-hidden className="size-4" />
              Registrar horas
            </>
          }
        >
          <FormularioMisHoras
            accion={registrarMisHoras.bind(null, ctx, anio.id, familia.id)}
            hoy={hoy}
            comisiones={comisiones.map((c) => ({ id: c.id, nombre: c.nombre }))}
            campanas={campanas.filter((c) => c.activa).map((c) => ({ id: c.id, nombre: c.nombre }))}
          />
        </PanelLateral>
      </header>

      {acuerdo ? (
        <Tarjeta className="space-y-1">
          <p className="text-xs font-semibold tracking-wide text-texto-suave uppercase">
            Nuestro acuerdo
          </p>
          <p className="font-titulo text-xl text-primario-oscuro">
            {formatearDinero(Number(acuerdo.monto_mensual), escuela)} y{' '}
            {formatearHoras(Number(acuerdo.horas_mensuales), escuela.idioma)} al mes
          </p>
          {tramo && <p className="text-sm text-texto-suave">{tramo.nombre}</p>}
        </Tarjeta>
      ) : (
        <Tarjeta>
          <p className="text-texto-suave">
            Todavía no tenemos registrado el acuerdo de este año. La administración lo
            conversa con cada familia y lo anota aquí. Mientras, pueden registrar sus
            horas.
          </p>
        </Tarjeta>
      )}

      <AvanceALaFecha totales={totales} escuela={escuela} />

      <section className="space-y-4">
        <h2 className="font-titulo text-xl">Mes a mes</h2>
        <TablaMeses meses={meses} escuela={escuela} conAnio={cruzaAnioCivil(anio.inicio, anio.fin)} />
      </section>

      <section className="space-y-4">
        <h2 className="font-titulo text-xl">Lo registrado</h2>
        <ListaAportes
          aportes={aportes}
          escuela={escuela}
          acciones={(aporte) =>
            aporte.estado === 'registrado' && aporte.registrado_por === user.id ? (
              <BotonAccion accion={retirarMisHoras.bind(null, ctx, aporte.id)} variante="fantasma">
                Retirar
              </BotonAccion>
            ) : null
          }
        />
      </section>
    </div>
  )
}
