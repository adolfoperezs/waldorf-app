import { Plus } from 'lucide-react'
import Link from 'next/link'
import type { ContextoEscuela } from '@/features/ritmo/actions/contexto'
import { crearEvento } from '@/features/ritmo/actions/evento'
import { FormularioEvento } from '@/features/ritmo/components/formulario-evento'
import { textoSemana } from '@/features/ritmo/lib/exportar-whatsapp'
import { formatearInstante } from '@/features/ritmo/lib/fechas'
import { eventosDeEscuela, eventosProximos } from '@/features/ritmo/queries/ritmo'
import { NOMBRE_TIPO_EVENTO } from '@/features/ritmo/schemas/ritmo'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'
import { CopiarParaWhatsapp } from '@/shared/ui/copiar-para-whatsapp'
import { PanelLateral } from '@/shared/ui/panel-lateral'

const URL_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default async function PaginaEventos({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { escuela, esGestor } = await cargarEscuela(slug)

  const ctx: ContextoEscuela = {
    escuelaId: escuela.id,
    slug: escuela.slug,
    zonaHoraria: escuela.zona_horaria,
  }

  // Los eventos internos los oculta la politica eventos_select, no este
  // codigo: una familia simplemente no los recibe (correccion H6).
  const [todos, proximos] = await Promise.all([
    eventosDeEscuela(escuela.id),
    eventosProximos(escuela.id, 20),
  ])

  return (
    <div className="space-y-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="font-titulo text-3xl">Encuentros</h1>
          <p className="text-texto-suave">
            Jornadas, asambleas, talleres y reuniones de comisión.
          </p>
        </div>
        {esGestor && (
          <PanelLateral
            titulo="Nuevo encuentro"
            disparador={
              <>
                <Plus aria-hidden className="size-4" />
                Nuevo encuentro
              </>
            }
          >
            <FormularioEvento
              accion={crearEvento.bind(null, ctx)}
              zonaHoraria={escuela.zona_horaria}
            />
          </PanelLateral>
        )}
      </header>

      <section className="space-y-4">
        <h2 className="font-titulo text-xl">Todos</h2>

        {todos.length === 0 ? (
          <p className="text-texto-suave">Todavía no hay encuentros.</p>
        ) : (
          <ul className="space-y-3">
            {todos.map((evento) => (
              <li key={evento.id}>
                <Link
                  href={`/${slug}/eventos/${evento.id}`}
                  className="block rounded-organico border border-borde bg-superficie p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-elevado"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="font-medium">{evento.titulo}</p>
                    <span className="text-xs text-texto-suave">
                      {NOMBRE_TIPO_EVENTO[evento.tipo]}
                    </span>
                    {!evento.publico && (
                      <span className="rounded-full bg-crema-200 px-2.5 py-0.5 text-xs text-primario-oscuro">
                        Solo el equipo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-texto-suave">
                    {formatearInstante(
                      evento.inicio,
                      escuela.zona_horaria,
                      escuela.idioma,
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {proximos.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-titulo text-xl">Para mandar al grupo</h2>
          <p className="text-texto-suave">
            Las escuelas viven en WhatsApp y no lo van a dejar. No competimos con
            eso: aquí está el resumen listo para enviar.
          </p>
          <CopiarParaWhatsapp texto={textoSemana(proximos, escuela, URL_BASE)} />
        </section>
      )}
    </div>
  )
}
