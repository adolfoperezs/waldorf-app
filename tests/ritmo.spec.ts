import { expect, test, type Page } from '@playwright/test'

/**
 * Fase 1 del roadmap, de punta a punta y en ventana de telefono.
 *
 * Criterio de salida: una escuela planifica su anio completo en el sistema.
 *
 * Requiere el stack local: `npm run db:start`.
 */

const CORRIDA = Date.now().toString(36)
const CORREO = `ritmo.${CORRIDA}@ejemplo.cl`
const CLAVE = 'una-frase-larga-de-prueba'
const SLUG = `ritmo-${CORRIDA}`

/** 'YYYY-MM-DD' desplazado en dias respecto de hoy. */
function dia(desplazamiento: number): string {
  const fecha = new Date()
  fecha.setUTCDate(fecha.getUTCDate() + desplazamiento)
  return fecha.toISOString().slice(0, 10)
}

// El anio empieza HOY: asi la primera epoca esta siempre en curso y el
// calendario tiene algo que mostrar sin depender de la fecha en que se corra.
const INICIO = dia(0)
const FIN = dia(300)

/**
 * Abre la epoca desde la lista y ESPERA a que la pagina de detalle este.
 *
 * Un `click` no espera la navegacion. Sin esperar, `fill` puede actuar sobre
 * la pagina de la lista antes de que llegue la de detalle, y el test pasa a
 * verde en el guardado y falla despues, lejos de la causa.
 */
async function abrirEpoca(page: Page, patron: RegExp) {
  await page.getByRole('link', { name: patron }).click()
  await expect(page).toHaveURL(/\/epocas\/[0-9a-f-]{36}$/)
  await expect(page.getByRole('button', { name: 'Guardar la época' })).toBeVisible()
}

/**
 * Los formularios de alta viven en un panel lateral (`<dialog>`) que se abre
 * con un boton. Se abre y se espera a que el panel este antes de escribir.
 */
async function abrirPanel(page: Page, disparador: string, titulo: string) {
  await page.getByRole('button', { name: disparador }).click()
  await expect(page.getByRole('dialog', { name: titulo })).toBeVisible()
}

async function entrar(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Correo').fill(CORREO)
  await page.getByLabel('Contraseña').fill(CLAVE)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(`/${SLUG}`)
}

test.beforeAll(async ({ browser }) => {
  const page = await browser.newPage()

  await page.goto('/signup')
  await page.getByLabel('Nombre y apellido').fill('Maestra del Ritmo')
  await page.getByLabel('Correo').fill(CORREO)
  await page.getByLabel('Contraseña').fill(CLAVE)
  await page.getByRole('button', { name: 'Crear cuenta' }).click()

  await page.getByRole('link', { name: 'Crear una escuela' }).click()
  await page.getByLabel('Nombre de la escuela').fill('Escuela del Ritmo')
  await page.getByLabel('Identificador en la dirección').fill(SLUG)
  await page.getByRole('button', { name: 'Crear la escuela' }).click()
  await expect(page).toHaveURL(`/${SLUG}`)

  await page.close()
})

test('crear el anio, activarlo y cargar la plantilla', async ({ page }) => {
  await entrar(page)

  await page.goto(`/${SLUG}/anios`)
  await abrirPanel(page, 'Nuevo año', 'Nuevo año escolar')
  await page.getByLabel('Nombre del año').fill('2026')
  await page.getByLabel('Primer día').fill(INICIO)
  await page.getByLabel('Último día').fill(FIN)
  await page.getByRole('button', { name: 'Crear el año' }).click()

  // Si sale bien, el panel se cierra solo y el anio aparece en la lista.
  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByRole('heading', { name: '2026' })).toBeVisible()

  await page.getByRole('button', { name: 'Activar' }).click()
  // Exacto: la bajada de la pagina dice "Solo uno activo a la vez".
  await expect(page.getByText('Activo', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Cargar la plantilla' }).click()

  // Seis epocas de la plantilla kimun-cl.
  await expect(page.getByText('6 épocas')).toBeVisible()
})

test('el calendario muestra la epoca en curso y su minuta', async ({ page }) => {
  await entrar(page)
  await page.goto(`/${SLUG}/calendario`)

  await expect(page.getByText('Año 2026')).toBeVisible()

  // La primera epoca empieza el mismo dia que el anio, asi que hoy cae dentro.
  await expect(page.getByRole('heading', { name: 'Ahora' })).toBeVisible()
  await expect(page.getByText('Números y ritmo').first()).toBeVisible()

  // La minuta de la epoca sale de la plantilla: lunes arroz, martes legumbres.
  await expect(page.getByText('Arroz')).toBeVisible()
  await expect(page.getByText('Legumbres')).toBeVisible()

  await expect(page.getByRole('heading', { name: 'Próximos encuentros' })).toBeVisible()

  // Y la linea del anio completo.
  await expect(page.getByRole('heading', { name: 'El año' })).toBeVisible()
  await expect(page.getByText('En curso')).toBeVisible()
})

test('una epoca que se solapa da un mensaje humano, no un error de Postgres', async ({
  page,
}) => {
  await entrar(page)
  await page.goto(`/${SLUG}/epocas`)
  await abrirPanel(page, 'Nueva época', 'Nueva época')

  await page.getByLabel('Nombre de la época').fill('Época encimada')
  await page.getByLabel('Empieza').fill(INICIO)
  await page.getByLabel('Termina').fill(dia(10))
  await page.getByRole('button', { name: 'Crear la época' }).click()

  // Con error, el panel sigue abierto y el mensaje sale dentro.
  await expect(
    page.getByText('Estas fechas se cruzan con otra época. Elige otro rango.'),
  ).toBeVisible()

  // Nunca el texto crudo de la base (docs/PRIVACY.md).
  await expect(page.getByText('exclusion constraint')).toHaveCount(0)
  await expect(page.getByText('23P01')).toHaveCount(0)
})

test('una epoca en un hueco libre si se crea', async ({ page }) => {
  await entrar(page)
  await page.goto(`/${SLUG}/epocas`)
  await abrirPanel(page, 'Nueva época', 'Nueva época')

  // Al final del anio, despues de las seis de la plantilla.
  await page.getByLabel('Nombre de la época').fill('Cierre del año')
  await page.getByLabel('Empieza').fill(dia(290))
  await page.getByLabel('Termina').fill(dia(299))
  await page.getByRole('button', { name: 'Crear la época' }).click()

  await expect(page.getByRole('dialog')).toBeHidden()
  await expect(page.getByText('Cierre del año')).toBeVisible()
  await expect(page.getByText('7 épocas')).toBeVisible()
})

test('crear un encuentro, inscribirse y exportarlo a WhatsApp', async ({ page }) => {
  await entrar(page)
  await page.goto(`/${SLUG}/eventos`)
  await abrirPanel(page, 'Nuevo encuentro', 'Nuevo encuentro')

  await page.getByLabel('Título').fill('Jornada de huerto')
  await page.getByLabel('Fecha').fill(dia(14))
  await page.getByLabel('Hora').fill('10:00')
  await page.getByLabel('Dónde').fill('La huerta')
  await page.getByLabel('Hay que inscribirse').check()
  await page.getByRole('button', { name: 'Crear el encuentro' }).click()

  await expect(page.getByRole('dialog')).toBeHidden()
  await page.getByRole('link', { name: /Jornada de huerto/ }).first().click()

  await expect(
    page.getByRole('heading', { name: 'Jornada de huerto' }),
  ).toBeVisible()
  await expect(page.getByText('0 personas inscritas')).toBeVisible()

  await page.getByRole('button', { name: 'Me inscribo' }).click()
  await expect(page.getByText('1 persona inscrita')).toBeVisible()

  // La asistencia la registra quien organiza.
  await expect(page.getByRole('heading', { name: 'Asistencia' })).toBeVisible()

  // Y el texto listo para pegar en el grupo, con la hora de la escuela.
  const paraPegar = page.getByLabel('Texto para WhatsApp')
  await expect(paraPegar).toContainText('*Jornada de huerto*')
  await expect(paraPegar).toContainText('10:00')
  await expect(paraPegar).toContainText('Dónde: La huerta')
  await expect(page.getByRole('link', { name: 'Enviar por WhatsApp' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copiar el texto' })).toBeVisible()

  await page.getByRole('button', { name: 'Anular mi inscripción' }).click()
  await expect(page.getByText('0 personas inscritas')).toBeVisible()
})

test('la vista de telefono no se desborda a lo ancho', async ({ page }) => {
  await entrar(page)

  // El usuario tipico esta en un telefono de gama media. Un calendario con
  // scroll horizontal es inservible ahi.
  const desborde = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(desborde).toBe(false)

  // Queda como evidencia revisable a ojo: el sistema de diseno tiene que
  // leerse calido, no como un panel de control.
  await page.screenshot({
    path: 'test-results/calendario-movil.png',
    fullPage: true,
  })
})

test('editar una epoca: mover fechas y cambiar el orden', async ({ page }) => {
  await entrar(page)
  await page.goto(`/${SLUG}/epocas`)

  await abrirEpoca(page, /1\. Números y ritmo/)

  await page.getByLabel('Nombre de la época').fill('Números y ritmo (ajustada)')
  await page.getByLabel('Tema').fill('Las cuatro operaciones')
  await page.getByLabel('Termina').fill(dia(20))
  await page.getByRole('button', { name: 'Guardar la época' }).click()

  await expect(page.getByText('Época guardada.')).toBeVisible()

  await page.goto(`/${SLUG}/epocas`)
  await expect(page.getByText('Números y ritmo (ajustada)')).toBeVisible()
})

test('mover una epoca encima de otra tampoco se permite al editar', async ({
  page,
}) => {
  await entrar(page)
  await page.goto(`/${SLUG}/epocas`)
  await abrirEpoca(page, /1\. Números y ritmo/)

  // La epoca 2 de la plantilla empieza mucho despues; estirar la 1 hasta el
  // dia 200 la pisa con seguridad.
  await page.getByLabel('Termina').fill(dia(200))
  await page.getByRole('button', { name: 'Guardar la época' }).click()

  await expect(
    page.getByText('Estas fechas se cruzan con otra época. Elige otro rango.'),
  ).toBeVisible()
})

test('editar la minuta de una epoca se refleja en el calendario', async ({ page }) => {
  await entrar(page)
  await page.goto(`/${SLUG}/epocas`)
  await abrirEpoca(page, /1\. Números y ritmo/)

  // La plantilla dejo arroz el lunes. Cada escuela ajusta el suyo.
  await page.getByLabel('Lunes').fill('Quinoa del huerto')
  // Un dia en blanco se quita de la minuta.
  await page.getByLabel('Viernes').fill('')
  await page.getByRole('button', { name: 'Guardar la minuta' }).click()

  await expect(page.getByText('Minuta guardada.')).toBeVisible()

  await page.goto(`/${SLUG}/calendario`)
  await expect(page.getByText('Quinoa del huerto')).toBeVisible()
  await expect(page.getByText('Arroz')).toHaveCount(0)
  await expect(page.getByText('Avena')).toHaveCount(0)
})
