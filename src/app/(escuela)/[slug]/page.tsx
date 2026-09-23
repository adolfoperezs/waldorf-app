import Link from 'next/link'
import { gruposPorIds, ninosDeMiFamilia } from '@/features/comunidad/queries/comunidad'
import { PanelNino } from '@/features/ritmo/components/panel-nino'
import { SelectorDeHijos } from '@/features/ritmo/components/selector-de-hijos'
import { VistaCalendario } from '@/features/ritmo/components/vista-calendario'
import {
  formatearInstante,
  formatearSemana,
  hoyEnEscuela,
  lunesDe,
  semanaVisible,
} from '@/features/ritmo/lib/fechas'
import { eventosProximos } from '@/features/ritmo/queries/ritmo'
import {
  contextoDeSemana,
  diasDeLaSemana,
  epocaDelDia,
  eventosDeGrupos,
  ritmosDeSemana,
} from '@/features/ritmo/queries/ritmo-semanal'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'

/**
 * La portada. Para una familia, el ritmo de cada hijo segun su ciclo, con el
 * selector de hijos arriba (lineamiento, 3.1). Para el equipo, sin hijos en
 * la escuela, el calendario.
 *
 * Es la pantalla mas usada del sistema y su lector tipico es un apoderado en
 * un telefono de gama media con mala senal: todo en una pasada al servidor.
 */
export default async function PaginaInicio({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { escuela, roles, esGestor } = await cargarEscuela(slug)
  const accesoMiCurso =
    esGestor || roles.some((rol) => rol === 'maestro_guia' || rol === 'maestro_especialidad')

  // Lectura auditada: pasa por ninos_de_mi_familia (docs/PRIVACY.md, nivel Menor).
  const hijos = await ninosDeMiFamilia(escuela.id)

  if (hijos.length === 0) {
    return (
      <VistaCalendario escuela={escuela} esGestor={esGestor} accesoMiCurso={accesoMiCurso} />
    )
  }

  const hoy = hoyEnEscuela(escuela.zona_horaria)
  const semana = semanaVisible(hoy)
  const esProximaSemana = semana > lunesDe(hoy)
  // Para la epoca vigente: hoy, o el lunes si ya se muestra la semana que viene.
  const diaDeReferencia = esProximaSemana ? semana : hoy

  const grupoIds = [
    ...new Set(hijos.map((h) => h.grupo_id).filter((id): id is string => Boolean(id))),
  ]

  const [grupos, ritmos, contexto, eventos, proximos] = await Promise.all([
    gruposPorIds(grupoIds),
    ritmosDeSemana(grupoIds, semana, { soloPublicado: true }),
    contextoDeSemana(escuela.id, grupoIds, semana),
    eventosDeGrupos(escuela.id, grupoIds),
    eventosProximos(escuela.id, 3),
  ])

  const grupoPorId = new Map(grupos.map((g) => [g.id, g]))
  const rangoSemana = formatearSemana(semana, escuela.idioma)

  const enSelector = hijos.map((hijo) => {
    const grupo = hijo.grupo_id ? (grupoPorId.get(hijo.grupo_id) ?? null) : null
    return {
      id: hijo.id,
      nombre: hijo.nombre,
      grupo: grupo?.nombre ?? null,
      modalidad: grupo?.ciclo?.modalidad ?? null,
      acento: grupo?.ciclo?.acento ?? null,
      panel: (
        <PanelNino
          nombre={hijo.nombre}
          grupo={grupo}
          ritmo={grupo ? ritmos.get(grupo.id) : undefined}
          dias={grupo ? diasDeLaSemana(grupo.id, semana, ritmos.get(grupo.id), contexto) : []}
          epoca={grupo ? epocaDelDia(contexto.epocas, grupo.id, diaDeReferencia) : null}
          eventos={eventos.filter((e) => e.grupo_id === grupo?.id)}
          hoy={hoy}
          esProximaSemana={esProximaSemana}
          rangoSemana={rangoSemana}
          escuela={escuela}
        />
      ),
    }
  })

  return (
    <div className="space-y-10">
      <h1 className="font-titulo text-3xl">
        {hijos.length === 1 ? `El ritmo de ${hijos[0].nombre}` : 'El ritmo de tus hijos'}
      </h1>

      <SelectorDeHijos hijos={enSelector} clave={escuela.id} />

      <section className="space-y-4 border-t border-borde pt-8">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-titulo text-xl">En la escuela</h2>
          <Link href={`/${slug}/calendario`} className="text-sm text-acento underline">
            Ver el calendario
          </Link>
        </div>

        {proximos.length === 0 ? (
          <p className="text-texto-suave">No hay encuentros agendados.</p>
        ) : (
          <ul className="space-y-3">
            {proximos.map((evento) => (
              <li key={evento.id}>
                <Link
                  href={`/${slug}/eventos/${evento.id}`}
                  className="block rounded-organico border border-borde bg-superficie p-4 transition duration-200 hover:-translate-y-0.5 hover:shadow-elevado"
                >
                  <p className="font-medium">{evento.titulo}</p>
                  <p className="text-sm text-texto-suave">
                    {formatearInstante(evento.inicio, escuela.zona_horaria, escuela.idioma)}
                    {evento.lugar ? ` · ${evento.lugar}` : ''}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
