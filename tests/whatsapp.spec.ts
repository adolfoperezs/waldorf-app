import { expect, test } from '@playwright/test'
import {
  textoEpoca,
  textoEvento,
  textoFestividad,
  textoSemana,
} from '../src/features/ritmo/lib/exportar-whatsapp'

/**
 * Exportacion a WhatsApp. Funciones puras: ni red ni base de datos.
 *
 * Lo que se comprueba de verdad aqui es que las horas salgan en la zona de LA
 * ESCUELA y que los dias del calendario no se corran, que es el error mas
 * facil de cometer y el mas dificil de ver.
 */

const KIMUN = {
  slug: 'kimun',
  nombre: 'Escuela Waldorf Kimun',
  zona_horaria: 'America/Santiago',
  idioma: 'es',
}

const BERLIN = { ...KIMUN, slug: 'berlin', zona_horaria: 'Europe/Berlin' }

const URL = 'https://waldorf.example'

test('el evento sale en la hora de la escuela, no en UTC', () => {
  // 13:00 UTC del 21 de septiembre son las 10:00 en Algarrobo: en septiembre
  // Chile ya esta en horario de verano (UTC-3), no en UTC-4. Por eso el
  // desfase se pregunta para la fecha del evento y no para hoy.
  const evento = {
    id: 'e1',
    titulo: 'Jornada de huerto',
    descripcion: 'Traer guantes.',
    lugar: 'La huerta',
    inicio: '2026-09-21T13:00:00Z',
    requiere_inscripcion: true,
  }

  const texto = textoEvento(evento, KIMUN, URL)

  expect(texto).toContain('*Jornada de huerto*')
  expect(texto).toContain('10:00')
  expect(texto).toContain('Dónde: La huerta')
  expect(texto).toContain('Traer guantes.')
  expect(texto).toContain('Hay que inscribirse.')
  expect(texto).toContain('https://waldorf.example/kimun/eventos/e1')

  // La misma marca de tiempo, otra escuela, otra hora local.
  expect(textoEvento(evento, BERLIN, URL)).toContain('15:00')
})

test('omite las partes que no existen, sin dejar huecos', () => {
  const texto = textoEvento(
    {
      id: 'e2',
      titulo: 'Asamblea',
      descripcion: null,
      lugar: null,
      inicio: '2026-09-21T13:00:00Z',
      requiere_inscripcion: false,
    },
    KIMUN,
    URL,
  )

  expect(texto).not.toContain('Dónde:')
  expect(texto).not.toContain('Hay que inscribirse')
  expect(texto).not.toMatch(/\n\n\n/)
})

test('una festividad no se corre de dia por la zona horaria', () => {
  // El bug clasico: 'YYYY-MM-DD' pasado por new Date() y formateado en una
  // zona al oeste de Greenwich sale como el dia anterior.
  const texto = textoFestividad(
    { nombre: 'San Miguel', descripcion: null, fecha: '2026-09-29' },
    KIMUN,
    URL,
  )

  expect(texto).toContain('29')
  expect(texto).toContain('septiembre')
  expect(texto).not.toContain('28')
})

test('la epoca muestra su rango completo', () => {
  const texto = textoEpoca(
    {
      nombre: 'Números y ritmo',
      tema: 'Las cuatro operaciones',
      inicio: '2026-03-01',
      fin: '2026-03-28',
    },
    KIMUN,
    URL,
  )

  expect(texto).toContain('*Época: Números y ritmo*')
  expect(texto).toContain('1 de marzo')
  expect(texto).toContain('28 de marzo')
  expect(texto).toContain('Las cuatro operaciones')
  expect(texto).toContain('https://waldorf.example/kimun/calendario')
})

test('el resumen de la semana lista los encuentros', () => {
  const texto = textoSemana(
    [
      {
        id: 'e1',
        titulo: 'Jornada de huerto',
        descripcion: null,
        lugar: null,
        inicio: '2026-09-21T13:00:00Z',
        requiere_inscripcion: false,
      },
      {
        id: 'e2',
        titulo: 'Asamblea',
        descripcion: null,
        lugar: null,
        inicio: '2026-09-23T23:00:00Z',
        requiere_inscripcion: false,
      },
    ],
    KIMUN,
    URL,
  )

  expect(texto).toContain('*Escuela Waldorf Kimun — esta semana*')
  expect(texto).toContain('• Jornada de huerto')
  expect(texto).toContain('• Asamblea')
  expect(texto).toContain('https://waldorf.example/kimun/calendario')
})

test('una semana sin nada lo dice, no devuelve vacio', () => {
  const texto = textoSemana([], KIMUN, URL)
  expect(texto).toContain('No hay actividades agendadas.')
})
