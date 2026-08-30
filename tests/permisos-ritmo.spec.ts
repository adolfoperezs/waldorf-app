import { expect, test } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Quien puede ver y hacer que dentro de UNA MISMA escuela.
 *
 * El test de aislamiento cubre la frontera entre escuelas. Este cubre la de
 * adentro: una familia es miembro de pleno derecho y aun asi no ve los
 * encuentros internos del equipo ni puede configurar el ritmo.
 *
 * Es la prueba de la correccion H6: `eventos.publico` tenia el comentario
 * "false = solo equipo" pero ninguna politica lo aplicaba, asi que cualquier
 * miembro veia los eventos internos.
 *
 * Todo con anon key y sesiones reales, nunca service_role.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const CORRIDA = Date.now().toString(36)

function clienteAnonimo() {
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function registrar(etiqueta: string) {
  const cliente = clienteAnonimo()
  const { data, error } = await cliente.auth.signUp({
    email: `${etiqueta}.${CORRIDA}@ejemplo.cl`,
    password: 'una-frase-larga-de-prueba',
    options: { data: { nombre_completo: etiqueta } },
  })
  expect(error, `alta de ${etiqueta}`).toBeNull()
  return { cliente, perfilId: data.user!.id }
}

let gestor: SupabaseClient
let familia: SupabaseClient
let escuelaId: string
let anioId: string
let eventoPublicoId: string
let eventoInternoId: string

test.beforeAll(async () => {
  const admin = await registrar('gestora')
  gestor = admin.cliente

  const { data: id, error: errorEscuela } = await gestor.rpc('crear_escuela', {
    p_slug: `permisos-${CORRIDA}`,
    p_nombre: 'Escuela de Permisos',
  })
  expect(errorEscuela).toBeNull()
  escuelaId = id as string

  const { data: anio } = await gestor
    .from('anios_escolares')
    .insert({
      escuela_id: escuelaId,
      nombre: '2026',
      inicio: '2026-03-01',
      fin: '2026-12-15',
      activo: true,
    })
    .select('id')
    .single()
  anioId = anio!.id

  const { data: eventos, error: errorEventos } = await gestor
    .from('eventos')
    .insert([
      {
        escuela_id: escuelaId,
        tipo: 'jornada',
        titulo: 'Jornada abierta',
        inicio: '2026-04-11T13:00:00Z',
        publico: true,
      },
      {
        escuela_id: escuelaId,
        tipo: 'reunion_comision',
        titulo: 'Reunion interna del equipo',
        inicio: '2026-04-12T13:00:00Z',
        publico: false,
      },
    ])
    .select('id, publico')
  expect(errorEventos).toBeNull()

  eventoPublicoId = eventos!.find((e) => e.publico)!.id
  eventoInternoId = eventos!.find((e) => !e.publico)!.id

  // Una familia de la misma escuela: miembro de pleno derecho.
  const miembro = await registrar('familia')
  familia = miembro.cliente

  const { error: errorMembresia } = await gestor.from('membresias').insert({
    escuela_id: escuelaId,
    perfil_id: miembro.perfilId,
    rol: 'familia',
  })
  expect(errorMembresia, 'alta de la membresia de familia').toBeNull()
})

test('la familia si ve el encuentro publico', async () => {
  const { data, error } = await familia
    .from('eventos')
    .select('id, titulo')
    .eq('id', eventoPublicoId)

  expect(error).toBeNull()
  expect(data).toHaveLength(1)
})

test('H6: la familia NO ve el encuentro interno del equipo', async () => {
  const { data, error } = await familia
    .from('eventos')
    .select('id, titulo')
    .eq('id', eventoInternoId)

  // Cero filas, no un error: la politica filtra, no rechaza.
  expect(error).toBeNull()
  expect(data).toEqual([])
})

test('H6: al listar todo, la familia solo recibe los publicos', async () => {
  const { data, error } = await familia.from('eventos').select('titulo, publico')

  expect(error).toBeNull()
  expect(data!.every((evento) => evento.publico)).toBe(true)
  expect(data!.map((e) => e.titulo)).toEqual(['Jornada abierta'])
})

test('el gestor si ve los dos', async () => {
  const { data } = await gestor.from('eventos').select('titulo')
  expect(data).toHaveLength(2)
})

test('la familia no puede crear epocas', async () => {
  const { error } = await familia.from('epocas').insert({
    escuela_id: escuelaId,
    anio_id: anioId,
    nombre: 'Epoca de la familia',
    inicio: '2026-05-04',
    fin: '2026-05-29',
  })

  // Aqui SI se espera error: escribir sin ser gestor debe rebotar contra la
  // politica with check, no colarse.
  expect(error).not.toBeNull()
})

test('la familia no puede activar un anio, aunque lo vea', async () => {
  // Lo ve: es miembro y anios_escolares_select pide es_miembro.
  const { data } = await familia.from('anios_escolares').select('id').eq('id', anioId)
  expect(data).toHaveLength(1)

  // Pero activar_anio comprueba es_gestor por dentro y levanta 42501.
  const { error } = await familia.rpc('activar_anio', { p_anio: anioId })
  expect(error).not.toBeNull()
})

test('la familia no puede materializar la plantilla', async () => {
  const { error } = await familia.rpc('materializar_plantilla', {
    p_anio: anioId,
    p_plantilla: { epocas: [{ orden: 1, nombre: 'Colada', semanas: 2 }] },
  })
  expect(error).not.toBeNull()
})

test('la familia si puede inscribirse en un encuentro publico', async () => {
  // evento_inscripciones_propia deja que cada persona gestione la suya.
  const { error } = await familia.from('evento_inscripciones').insert({
    escuela_id: escuelaId,
    evento_id: eventoPublicoId,
    perfil_id: (await familia.auth.getUser()).data.user!.id,
  })
  expect(error).toBeNull()
})

test('la familia no puede inscribir a otra persona', async () => {
  const otra = await registrar('tercera')

  const { error } = await familia.from('evento_inscripciones').insert({
    escuela_id: escuelaId,
    evento_id: eventoPublicoId,
    perfil_id: otra.perfilId,
  })
  expect(error).not.toBeNull()
})
