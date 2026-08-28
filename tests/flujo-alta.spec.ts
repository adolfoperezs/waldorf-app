import { expect, test } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

/**
 * Humo del flujo de entrada, en navegador y en ventana de telefono.
 *
 * Cubre lo que el test de aislamiento no toca: que las server actions, el
 * refresco de sesion de proxy.ts y el layout de escuela funcionen de verdad
 * desde el navegador, no solo contra la API.
 *
 * Requiere el stack local: `npm run db:start`.
 */

const CORRIDA = Date.now().toString(36)
const CORREO = `humo.${CORRIDA}@ejemplo.cl`
const CLAVE = 'una-frase-larga-de-prueba'
const SLUG = `kimun-${CORRIDA}`

test('sin sesion, una ruta de escuela lleva al login', async ({ page }) => {
  await page.goto('/una-escuela-cualquiera')

  await expect(page).toHaveURL(/\/login\?volver=/)
  await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible()
})

test('alta de cuenta, alta de escuela y entrada a la escuela', async ({ page }) => {
  await page.goto('/signup')

  await page.getByLabel('Nombre y apellido').fill('Maestra de Prueba')
  await page.getByLabel('Correo').fill(CORREO)
  await page.getByLabel('Contrasena').fill(CLAVE)
  await page.getByRole('button', { name: 'Crear cuenta' }).click()

  // Recien registrada y sin escuelas todavia.
  await expect(
    page.getByRole('heading', { name: 'Todavia no tienes escuelas' }),
  ).toBeVisible()

  await page.getByRole('link', { name: 'Crear una escuela' }).click()

  await page.getByLabel('Nombre de la escuela').fill('Escuela Waldorf Kimun')
  await page.getByLabel('Identificador en la direccion').fill(SLUG)
  await page.getByRole('button', { name: 'Crear la escuela' }).click()

  // B1 + B2: quien crea la escuela queda como su administracion.
  await expect(page).toHaveURL(`/${SLUG}`)
  await expect(
    page.getByRole('heading', { name: 'Escuela Waldorf Kimun' }),
  ).toBeVisible()
  await expect(page.getByText('Administracion')).toBeVisible()
})

test('cerrar sesion y volver a entrar', async ({ page }) => {
  await page.goto('/login')

  await page.getByLabel('Correo').fill(CORREO)
  await page.getByLabel('Contrasena').fill(CLAVE)
  await page.getByRole('button', { name: 'Entrar' }).click()

  // Con una sola escuela se entra directo: es el caso mayoritario.
  await expect(page).toHaveURL(`/${SLUG}`)

  await page.getByRole('button', { name: 'Salir' }).click()
  await expect(page).toHaveURL(/\/login/)
})

test('un slug de escuela ajena responde 404, no 403', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Correo').fill(CORREO)
  await page.getByLabel('Contrasena').fill(CLAVE)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await expect(page).toHaveURL(`/${SLUG}`)

  // Quien no es miembro no tiene por que distinguir "no existe" de
  // "existe pero no es tuya".
  const respuesta = await page.goto('/escuela-que-no-es-suya')
  expect(respuesta?.status()).toBe(404)
})

test('el alta clona la plantilla base', async () => {
  // La plantilla es la capa configurable de docs/ARCHITECTURE.md: lo que cada
  // escuela hace distinto vive como dato en supabase/seed/plantillas/, nunca
  // como constante en el codigo.
  const cliente = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )

  const { error: errorSesion } = await cliente.auth.signInWithPassword({
    email: CORREO,
    password: CLAVE,
  })
  expect(errorSesion).toBeNull()

  const { data: comisiones, error } = await cliente
    .from('comisiones')
    .select('nombre')
    .order('nombre')

  expect(error).toBeNull()
  expect(comisiones!.map((c) => c.nombre)).toEqual([
    'Construccion',
    'Cultura',
    'Economia',
    'Festividades',
    'Huerto',
  ])
})
