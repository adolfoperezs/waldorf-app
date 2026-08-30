import { formatearDia, formatearInstante } from './fechas'

/**
 * Exportacion a WhatsApp.
 *
 * Las escuelas viven en WhatsApp y no lo van a dejar. No construimos
 * mensajeria: generamos un texto listo para pegar en el grupo, mas un enlace
 * profundo al sistema (docs/ARCHITECTURE.md).
 *
 * Solo salida. NUNCA leer, almacenar ni procesar mensajes de la comunidad.
 *
 * Son funciones puras: sin acceso a red ni a la base, faciles de probar.
 */

type Escuela = {
  slug: string
  nombre: string
  zona_horaria: string
  idioma: string
}

type Evento = {
  id: string
  titulo: string
  descripcion: string | null
  lugar: string | null
  inicio: string
  requiere_inscripcion: boolean
}

type Festividad = {
  nombre: string
  descripcion: string | null
  fecha: string
}

type Epoca = {
  nombre: string
  tema: string | null
  inicio: string
  fin: string
}

/** WhatsApp pone en negrita lo que va entre asteriscos. */
const negrita = (texto: string) => `*${texto}*`

/** Une los trozos que existan, separados por lineas en blanco. */
function componer(...partes: (string | null | undefined | false)[]): string {
  return partes.filter(Boolean).join('\n\n')
}

function enlace(base: string, slug: string, ruta = ''): string {
  return `${base.replace(/\/$/, '')}/${slug}${ruta}`
}

export function textoEvento(
  evento: Evento,
  escuela: Escuela,
  urlBase: string,
): string {
  return componer(
    negrita(evento.titulo),
    formatearInstante(evento.inicio, escuela.zona_horaria, escuela.idioma),
    evento.lugar && `Donde: ${evento.lugar}`,
    evento.descripcion,
    evento.requiere_inscripcion && 'Hay que inscribirse.',
    enlace(urlBase, escuela.slug, `/eventos/${evento.id}`),
  )
}

export function textoFestividad(
  festividad: Festividad,
  escuela: Escuela,
  urlBase: string,
): string {
  return componer(
    negrita(festividad.nombre),
    formatearDia(festividad.fecha, escuela.idioma, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }),
    festividad.descripcion,
    enlace(urlBase, escuela.slug, '/calendario'),
  )
}

export function textoEpoca(
  epoca: Epoca,
  escuela: Escuela,
  urlBase: string,
): string {
  return componer(
    negrita(`Epoca: ${epoca.nombre}`),
    `${formatearDia(epoca.inicio, escuela.idioma)} a ${formatearDia(
      epoca.fin,
      escuela.idioma,
    )}`,
    epoca.tema,
    enlace(urlBase, escuela.slug, '/calendario'),
  )
}

/** Resumen de la semana: lo que viene, para pegar el lunes en el grupo. */
export function textoSemana(
  eventos: Evento[],
  escuela: Escuela,
  urlBase: string,
): string {
  if (eventos.length === 0) {
    return componer(
      negrita(`${escuela.nombre} — esta semana`),
      'No hay actividades agendadas.',
      enlace(urlBase, escuela.slug, '/calendario'),
    )
  }

  const lineas = eventos.map(
    (evento) =>
      `• ${evento.titulo} — ${formatearInstante(
        evento.inicio,
        escuela.zona_horaria,
        escuela.idioma,
        { weekday: 'long', hour: '2-digit', minute: '2-digit' },
      )}`,
  )

  return componer(
    negrita(`${escuela.nombre} — esta semana`),
    lineas.join('\n'),
    enlace(urlBase, escuela.slug, '/calendario'),
  )
}
