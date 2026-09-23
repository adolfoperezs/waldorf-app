import Link from 'next/link'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import {
  anularAporte,
  confirmarAporte,
  guardarAcuerdo,
  registrarAporte,
} from '@/features/economia/actions/economia'
import { FormularioAcuerdo, FormularioAporte } from '@/features/economia/components/formularios'
import { ListaAportes } from '@/features/economia/components/lista-aportes'
import { AvanceALaFecha, TablaMeses } from '@/features/economia/components/vistas'
import { mesesDeFamilia, mesesDelAnio, totalesALaFecha } from '@/features/economia/lib/cuentas'
import { formatearDinero, formatearHoras } from '@/features/economia/lib/formato'
import {
  acuerdosDeAnio,
  aportesDeAnio,
  campanasDeEscuela,
  comisionesDeEscuela,
  tramosDeAnio,
} from '@/features/economia/queries/economia'
import type { ContextoEscuela } from '@/features/ritmo/actions/contexto'
import { cruzaAnioCivil, hoyEnEscuela } from '@/features/ritmo/lib/fechas'
import { anioActivo } from '@/features/ritmo/queries/ritmo'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'
import type { EstadoFormulario } from '@/shared/lib/formulario'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { BotonAccion } from '@/shared/ui/boton-accion'
import { PanelLateral } from '@/shared/ui/panel-lateral'

/** El mes a mes de una familia, para la administracion. */
export default async function PaginaEconomiaFamilia({
  params,
}: {
  params: Promise<{ slug: string; familiaId: string }>
}) {
  const { slug, familiaId } = await params
  const { escuela, esAdministracion } = await cargarEscuela(slug)
  if (!esAdministracion || !z.uuid().safeParse(familiaId).success) notFound()

  const supabase = await crearClienteServidor()
  const [{ data: familia }, anio] = await Promise.all([
    supabase.from('familias').select('id, nombre').eq('id', familiaId).maybeSingle(),
    anioActivo(escuela.id),
  ])
  if (!familia || !anio) notFound()

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
      <header className="space-y-2">
        <Link href={`/${slug}/economia`} className="text-sm text-acento underline">
          Volver a Economía
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-titulo text-3xl">{familia.nombre}</h1>
            <p className="text-texto-suave">
              {acuerdo
                ? `Acuerdo ${anio.nombre}: ${tramo ? `${tramo.nombre}, ` : ''}${formatearDinero(Number(acuerdo.monto_mensual), escuela)} y ${formatearHoras(Number(acuerdo.horas_mensuales), escuela.idioma)} al mes`
                : `Sin acuerdo para ${anio.nombre}`}
            </p>
            {acuerdo?.notas && <p className="text-sm text-texto-suave">{acuerdo.notas}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <PanelLateral
              titulo={acuerdo ? 'Acuerdo' : 'Nuevo acuerdo'}
              descripcion={`${familia.nombre} · año ${anio.nombre}`}
              variante="suave"
              disparador={acuerdo ? 'Cambiar el acuerdo' : 'Crear acuerdo'}
            >
              <FormularioAcuerdo
                accion={guardarAcuerdo.bind(null, ctx, anio.id, familia.id)}
                tramos={tramos}
                acuerdo={acuerdo}
                inicioDelAnio={anio.inicio}
              />
            </PanelLateral>
            <PanelLateral titulo="Registrar un aporte" descripcion={familia.nombre} disparador="Registrar aporte">
              <FormularioAporte
                accion={registrarAporte.bind(null, ctx, anio.id, familia.id)}
                hoy={hoy}
                comisiones={comisiones.map((c) => ({ id: c.id, nombre: c.nombre }))}
                campanas={campanas.filter((c) => c.activa).map((c) => ({ id: c.id, nombre: c.nombre }))}
              />
            </PanelLateral>
          </div>
        </div>
      </header>

      <AvanceALaFecha totales={totales} escuela={escuela} />

      <section className="space-y-4">
        <h2 className="font-titulo text-xl">Mes a mes</h2>
        <TablaMeses meses={meses} escuela={escuela} conAnio={cruzaAnioCivil(anio.inicio, anio.fin)} />
      </section>

      <section className="space-y-4">
        <h2 className="font-titulo text-xl">Aportes registrados</h2>
        <ListaAportes
          aportes={aportes}
          escuela={escuela}
          acciones={(aporte) => (
            <>
              {aporte.estado === 'registrado' && (
                <PanelAccion
                  confirmar={confirmarAporte.bind(null, ctx, aporte.id)}
                  anular={anularAporte.bind(null, ctx, aporte.id)}
                />
              )}
              {aporte.estado === 'confirmado' && (
                <PanelAccion anular={anularAporte.bind(null, ctx, aporte.id)} />
              )}
            </>
          )}
        />
      </section>
    </div>
  )
}

type Accion = (previo: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>

function PanelAccion({ confirmar, anular }: { confirmar?: Accion; anular: Accion }) {
  return (
    <div className="flex flex-wrap gap-2">
      {confirmar && (
        <BotonAccion accion={confirmar} variante="primario">
          Confirmar
        </BotonAccion>
      )}
      <BotonAccion accion={anular} variante="fantasma">
        Anular
      </BotonAccion>
    </div>
  )
}
