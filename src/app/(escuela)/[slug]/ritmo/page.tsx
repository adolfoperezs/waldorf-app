import { ChevronLeft, ChevronRight, Pencil } from 'lucide-react'
import Link from 'next/link'
import { z } from 'zod'
import { ChipCiclo, IconoCiclo } from '@/features/comunidad/components/chip-ciclo'
import { gruposConCiclo, idsDeMisGrupos } from '@/features/comunidad/queries/comunidad'
import {
  guardarDia,
  guardarSemana,
  publicarRitmo,
  retirarRitmo,
  type ContextoSemana,
} from '@/features/ritmo/actions/ritmo-semanal'
import { BannerEpoca } from '@/features/ritmo/components/banner-epoca'
import { FormularioDia, FormularioSemana } from '@/features/ritmo/components/formulario-ritmo'
import { TarjetaDia } from '@/features/ritmo/components/tarjeta-dia'
import { DiaDeLaTira, TiraDeDias } from '@/features/ritmo/components/tira-de-dias'
import { textoRitmoSemanal } from '@/features/ritmo/lib/exportar-whatsapp'
import {
  dentroDe,
  formatearDia,
  formatearInstante,
  formatearSemana,
  hoyEnEscuela,
  lunesDe,
  NOMBRE_DIA,
  semanaVisible,
  sumarDias,
} from '@/features/ritmo/lib/fechas'
import {
  contextoDeSemana,
  diasDeLaSemana,
  epocaDelDia,
  ritmosDeSemana,
} from '@/features/ritmo/queries/ritmo-semanal'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'
import { clasesAcento } from '@/shared/design/acentos'
import { cn } from '@/shared/lib/utils'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { BotonAccion } from '@/shared/ui/boton-accion'
import { CopiarParaWhatsapp } from '@/shared/ui/copiar-para-whatsapp'
import { PanelLateral } from '@/shared/ui/panel-lateral'
import { Tarjeta } from '@/shared/ui/tarjeta'

const URL_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

/**
 * "Mi curso" (lineamiento, 3.2): la semana del grupo en tarjetas, un toque
 * para editar un dia, y publicar para las familias.
 *
 * La maestra ve sus grupos (grupo_maestros vigente); un gestor ve todos.
 * Esconder grupos es cortesia: quien puede escribir lo decide la RLS
 * (app.puede_editar_ritmo).
 *
 * `grupo` y `semana` van en la URL: son identificadores opacos y una fecha,
 * no datos personales.
 */
export default async function PaginaRitmo({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ grupo?: string; semana?: string }>
}) {
  const { slug } = await params
  const busqueda = await searchParams
  const { escuela, esGestor } = await cargarEscuela(slug)

  const supabase = await crearClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const hoy = hoyEnEscuela(escuela.zona_horaria)
  const todos = await gruposConCiclo(escuela.id)
  const mios = user ? new Set(await idsDeMisGrupos(escuela.id, user.id, hoy)) : new Set()
  const grupos = esGestor ? todos : todos.filter((g) => mios.has(g.id))

  if (grupos.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="font-titulo text-3xl">Mi curso</h1>
        <Tarjeta className="space-y-2">
          <p>Todavía no tienes un grupo a cargo.</p>
          <p className="text-sm text-texto-suave">
            La administración te asigna como maestra o maestro guía desde la
            página de Grupos. Cuando lo haga, aquí vas a cargar el ritmo de cada
            semana.
          </p>
        </Tarjeta>
      </div>
    )
  }

  const grupo = grupos.find((g) => g.id === busqueda.grupo) ?? grupos[0]
  const semana = z.iso.date().safeParse(busqueda.semana).success
    ? lunesDe(busqueda.semana as string)
    : semanaVisible(hoy)

  const [ritmos, contexto] = await Promise.all([
    ritmosDeSemana([grupo.id], semana, { soloPublicado: false }),
    contextoDeSemana(escuela.id, [grupo.id], semana),
  ])

  const ritmo = ritmos.get(grupo.id)
  const dias = diasDeLaSemana(grupo.id, semana, ritmo, contexto)
  const viernes = sumarDias(semana, 4)
  const epoca = epocaDelDia(
    contexto.epocas,
    grupo.id,
    dentroDe(hoy, semana, viernes) ? hoy : semana,
  )
  const modalidad = grupo.ciclo?.modalidad ?? 'escolar'
  const acento = clasesAcento(grupo.ciclo?.acento)
  const rangoSemana = formatearSemana(semana, escuela.idioma)
  const semanaActual = semanaVisible(hoy)

  const ctx: ContextoSemana = {
    escuelaId: escuela.id,
    slug: escuela.slug,
    zonaHoraria: escuela.zona_horaria,
    grupoId: grupo.id,
    semana,
  }

  const enlaceSemana = (lunes: string) => `/${slug}/ritmo?grupo=${grupo.id}&semana=${lunes}`

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-titulo text-3xl">Mi curso</h1>
        <p className="text-texto-suave">
          El ritmo de la semana, día por día. Toca un día para editarlo y publícalo
          cuando esté listo: recién ahí lo ven las familias.
        </p>
      </header>

      {grupos.length > 1 && (
        <nav aria-label="Grupos" className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1">
          {grupos.map((g) => {
            const activo = g.id === grupo.id
            const clases = clasesAcento(g.ciclo?.acento)
            return (
              <Link
                key={g.id}
                href={`/${slug}/ritmo?grupo=${g.id}&semana=${semana}`}
                aria-current={activo ? 'page' : undefined}
                className={cn(
                  'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 px-4 text-sm transition duration-200',
                  activo
                    ? cn('bg-superficie font-semibold shadow-elevado', clases.borde)
                    : 'border-borde text-texto-suave hover:bg-superficie',
                )}
              >
                <IconoCiclo
                  modalidad={g.ciclo?.modalidad}
                  className={activo ? clases.texto : undefined}
                />
                {g.nombre}
              </Link>
            )
          })}
        </nav>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Link
            href={enlaceSemana(sumarDias(semana, -7))}
            aria-label="Semana anterior"
            className="inline-flex size-11 items-center justify-center rounded-suave text-texto-suave transition hover:bg-crema-100 hover:text-texto"
          >
            <ChevronLeft aria-hidden className="size-5" />
          </Link>
          <div className="px-1">
            <p className="font-titulo text-lg text-primario-oscuro">Semana del {rangoSemana}</p>
            {semana !== semanaActual && (
              <Link href={enlaceSemana(semanaActual)} className="text-sm text-acento underline">
                Volver a la semana actual
              </Link>
            )}
          </div>
          <Link
            href={enlaceSemana(sumarDias(semana, 7))}
            aria-label="Semana siguiente"
            className="inline-flex size-11 items-center justify-center rounded-suave text-texto-suave transition hover:bg-crema-100 hover:text-texto"
          >
            <ChevronRight aria-hidden className="size-5" />
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ChipCiclo ciclo={grupo.ciclo} />
          {ritmo?.publicado_en ? (
            <span className="rounded-full bg-salvia-100 px-2.5 py-0.5 text-xs font-medium text-salvia-700">
              Publicado ·{' '}
              {formatearInstante(ritmo.publicado_en, escuela.zona_horaria, escuela.idioma, {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          ) : (
            <span className="rounded-full bg-crema-200 px-2.5 py-0.5 text-xs font-medium text-primario-oscuro">
              Borrador: las familias todavía no lo ven
            </span>
          )}
        </div>
      </div>

      {!grupo.ciclo && (
        <p className="rounded-organico border border-ocre-300 bg-ocre-100 p-4 text-sm">
          Este grupo no tiene ciclo. Las familias verán la vista escolar hasta que
          se le asigne uno{esGestor ? ' en ' : '.'}
          {esGestor && (
            <Link href={`/${slug}/grupos`} className="text-acento underline">
              Grupos
            </Link>
          )}
          {esGestor && '.'}
        </p>
      )}

      <section className="space-y-4">
        {modalidad === 'escolar' && epoca ? (
          <BannerEpoca
            epoca={epoca}
            hoy={dentroDe(hoy, semana, viernes) ? hoy : semana}
            idioma={escuela.idioma}
            acento={grupo.ciclo?.acento}
            tema={ritmo?.tema}
          />
        ) : (
          <div className={cn('space-y-1 rounded-organico p-5', acento.fondo)}>
            <p className={cn('text-xs font-semibold tracking-wide uppercase', acento.texto)}>
              {modalidad === 'jardin' ? 'Cuento de la semana' : 'Tema de la semana'}
            </p>
            <p className="font-titulo text-2xl text-primario-oscuro">
              {ritmo?.tema ?? 'Sin escribir todavía'}
            </p>
          </div>
        )}

        {ritmo?.recordatorio && (
          <p className="text-sm">
            <span className="text-texto-suave">Recordatorio: </span>
            {ritmo.recordatorio}
          </p>
        )}

        <PanelLateral
          titulo="La semana"
          descripcion={`Semana del ${rangoSemana} · ${grupo.nombre}`}
          variante="suave"
          disparador={
            <>
              <Pencil aria-hidden className="size-4" />
              {modalidad === 'jardin' ? 'Cuento y recordatorio' : 'Tema y recordatorio'}
            </>
          }
        >
          <FormularioSemana
            accion={guardarSemana.bind(null, ctx)}
            modalidad={modalidad}
            tema={ritmo?.tema ?? null}
            recordatorio={ritmo?.recordatorio ?? null}
          />
        </PanelLateral>
      </section>

      <section aria-label="Los días de la semana" className="space-y-3">
        <h2 className="font-titulo text-xl">Día por día</h2>
        <TiraDeDias>
          {dias.map((d) => {
            const nombreDia = NOMBRE_DIA[d.dia - 1]
            const fecha = formatearDia(d.fecha, escuela.idioma, { day: 'numeric', month: 'short' })
            return (
              <DiaDeLaTira key={d.dia} esHoy={d.fecha === hoy}>
                <PanelLateral
                  titulo={`${nombreDia} ${fecha}`}
                  descripcion={grupo.nombre}
                  variante="tarjeta"
                  claseDisparador="block h-full w-full rounded-organico transition duration-200 hover:-translate-y-0.5"
                  etiquetaDisparador={`Editar ${nombreDia.toLowerCase()} ${fecha}`}
                  disparador={
                    <TarjetaDia
                      nombreDia={nombreDia}
                      fecha={fecha}
                      esHoy={d.fecha === hoy}
                      alimento={d.alimento}
                      actividad={d.registro?.actividad ?? null}
                      materias={d.registro?.materias ?? []}
                      nota={d.registro?.nota ?? null}
                      modalidad={modalidad}
                      vacio="Toca para planificar"
                    />
                  }
                >
                  <FormularioDia
                    accion={guardarDia.bind(null, ctx)}
                    modalidad={modalidad}
                    dia={d.dia}
                    actividad={d.registro?.actividad ?? null}
                    materias={d.registro?.materias ?? []}
                    alimento={d.registro?.alimento ?? null}
                    alimentoMinuta={d.alimentoMinuta}
                    nota={d.registro?.nota ?? null}
                  />
                </PanelLateral>
              </DiaDeLaTira>
            )
          })}
        </TiraDeDias>
      </section>

      <section className="space-y-4 border-t border-borde pt-6">
        {ritmo?.publicado_en ? (
          <>
            <h2 className="font-titulo text-xl">Avisar en el grupo del curso</h2>
            <p className="text-texto-suave">
              Las familias ya lo ven en su teléfono. Los cambios que hagas se ven al
              instante. Para avisarles, manda el resumen por WhatsApp.
            </p>
            <CopiarParaWhatsapp
              texto={textoRitmoSemanal(
                {
                  grupo: grupo.nombre,
                  rangoSemana,
                  modalidad,
                  tema: ritmo.tema,
                  recordatorio: ritmo.recordatorio,
                  dias: dias.map((d) => ({
                    nombreDia: NOMBRE_DIA[d.dia - 1],
                    alimento: d.alimento,
                    actividad: d.registro?.actividad ?? null,
                    materias: d.registro?.materias ?? [],
                    nota: d.registro?.nota ?? null,
                  })),
                },
                escuela,
                URL_BASE,
              )}
            />
            <BotonAccion accion={retirarRitmo.bind(null, ctx)} variante="fantasma">
              Volver a borrador
            </BotonAccion>
          </>
        ) : (
          <>
            <p className="text-texto-suave">
              Cuando la semana esté lista, publícala. Después vas a poder mandar el
              resumen por WhatsApp.
            </p>
            <BotonAccion accion={publicarRitmo.bind(null, ctx)} variante="primario">
              Publicar ritmo para familias
            </BotonAccion>
          </>
        )}
      </section>
    </div>
  )
}
