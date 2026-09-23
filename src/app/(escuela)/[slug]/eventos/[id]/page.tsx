import { notFound } from 'next/navigation'
import type { ContextoEscuela } from '@/features/ritmo/actions/contexto'
import { alternarInscripcion, marcarAsistencia } from '@/features/ritmo/actions/evento'
import { CopiarParaWhatsapp } from '@/shared/ui/copiar-para-whatsapp'
import { formatearInstante } from '@/features/ritmo/lib/fechas'
import { textoEvento } from '@/features/ritmo/lib/exportar-whatsapp'
import { eventoPorId, inscripcionesDeEvento } from '@/features/ritmo/queries/ritmo'
import { NOMBRE_TIPO_EVENTO } from '@/features/ritmo/schemas/ritmo'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { BotonAccion } from '@/shared/ui/boton-accion'
import { Tarjeta } from '@/shared/ui/tarjeta'

const URL_BASE = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export default async function PaginaEvento({
  params,
}: {
  params: Promise<{ slug: string; id: string }>
}) {
  const { slug, id } = await params
  const { escuela, esGestor } = await cargarEscuela(slug)

  // Si el evento es interno y quien mira es una familia, la RLS devuelve nada
  // y esto es un 404. Igual que con las escuelas ajenas.
  const evento = await eventoPorId(id)
  if (!evento) notFound()

  const ctx: ContextoEscuela = {
    escuelaId: escuela.id,
    slug: escuela.slug,
    zonaHoraria: escuela.zona_horaria,
  }

  const supabase = await crearClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const inscripciones = evento.requiere_inscripcion
    ? await inscripcionesDeEvento(evento.id)
    : []

  const miInscripcion = inscripciones.find((i) => i.perfil_id === user?.id)
  const quedanCupos =
    evento.cupo === null || inscripciones.length < evento.cupo || Boolean(miInscripcion)

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-sm text-texto-suave">{NOMBRE_TIPO_EVENTO[evento.tipo]}</p>
        <h1 className="font-titulo text-3xl text-primario-oscuro">{evento.titulo}</h1>
        <p className="text-texto-suave">
          {formatearInstante(evento.inicio, escuela.zona_horaria, escuela.idioma)}
        </p>
        {evento.lugar && <p className="text-texto-suave">{evento.lugar}</p>}
        {!evento.publico && (
          <p className="text-sm text-atencion">
            Este encuentro solo lo ve el equipo.
          </p>
        )}
      </header>

      {evento.descripcion && <p>{evento.descripcion}</p>}

      {evento.requiere_inscripcion && (
        <section className="space-y-4">
          <h2 className="font-titulo text-xl text-primario-oscuro">Inscripción</h2>
          <Tarjeta className="space-y-4">
            <p className="text-texto-suave">
              {inscripciones.length}{' '}
              {inscripciones.length === 1 ? 'persona inscrita' : 'personas inscritas'}
              {evento.cupo !== null ? ` de ${evento.cupo}` : ''}
            </p>

            {quedanCupos ? (
              <BotonAccion
                accion={alternarInscripcion.bind(null, ctx, evento.id)}
                variante={miInscripcion ? 'suave' : 'primario'}
              >
                {miInscripcion ? 'Anular mi inscripción' : 'Me inscribo'}
              </BotonAccion>
            ) : (
              <p className="text-atencion">Ya no quedan cupos.</p>
            )}
          </Tarjeta>
        </section>
      )}

      {esGestor && evento.requiere_inscripcion && inscripciones.length > 0 && (
        <section className="space-y-4">
          <h2 className="font-titulo text-xl text-primario-oscuro">Asistencia</h2>
          <p className="text-sm text-texto-suave">
            Se registra para el acompañamiento, nunca como control.
          </p>
          <ul className="divide-y divide-borde">
            {inscripciones.map((inscripcion) => (
              <li
                key={inscripcion.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <span>{inscripcion.perfiles?.nombre_completo ?? 'Alguien'}</span>
                <BotonAccion
                  accion={marcarAsistencia.bind(
                    null,
                    ctx,
                    inscripcion.id,
                    evento.id,
                    !inscripcion.asistio,
                  )}
                >
                  {inscripcion.asistio ? 'Vino' : 'Marcar que vino'}
                </BotonAccion>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="font-titulo text-xl text-primario-oscuro">Para pegar en el grupo</h2>
        <CopiarParaWhatsapp texto={textoEvento(evento, escuela, URL_BASE)} />
      </section>
    </div>
  )
}
