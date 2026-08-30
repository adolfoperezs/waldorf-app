import { expect, test } from '@playwright/test'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Test de aislamiento entre escuelas.
 *
 * Es el criterio de salida de la Fase 0 del roadmap y lo exige tenancy-guard
 * antes de construir cualquier feature: dos escuelas con datos, autenticar
 * como miembro de la primera, e intentar leer datos de la segunda.
 *
 * La distincion importa: debe devolver CERO FILAS, no un error de permisos.
 * Un error significaria que la politica esta mal escrita o que falta; cero
 * filas significa que la RLS esta filtrando como corresponde.
 *
 * Todo se hace con la ANON KEY y sesiones reales. Ni una llamada con
 * service_role: usarla aqui probaria justamente lo contrario de lo que
 * queremos demostrar.
 *
 * Requiere el stack local: `npm run db:start`.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

/** Sufijo por corrida para poder repetir el test sin resetear la base. */
const CORRIDA = Date.now().toString(36)

type Escuela = {
  cliente: SupabaseClient
  escuelaId: string
  slug: string
  anioId: string
  epocaId: string
  familiaId: string
  ninoId: string
  eventoId: string
}

function clienteAnonimo() {
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/** Da de alta una persona, su escuela y un poco de contenido dentro. */
async function montarEscuela(etiqueta: string): Promise<Escuela> {
  const cliente = clienteAnonimo()
  const slug = `${etiqueta}-${CORRIDA}`

  const { error: errorAlta } = await cliente.auth.signUp({
    email: `${etiqueta}.${CORRIDA}@ejemplo.cl`,
    password: 'una-frase-larga-de-prueba',
    options: { data: { nombre_completo: `Maestra ${etiqueta}` } },
  })
  expect(errorAlta, `alta de usuario ${etiqueta}`).toBeNull()

  // B1 + B2: sin public.crear_escuela esto era imposible. No hay politica de
  // INSERT en escuelas, y membresias exigia ser ya administracion.
  const { data: escuelaId, error: errorEscuela } = await cliente.rpc('crear_escuela', {
    p_slug: slug,
    p_nombre: `Escuela ${etiqueta}`,
    p_pais: 'CL',
    p_zona_horaria: 'America/Santiago',
    p_idioma: 'es',
    p_moneda: 'CLP',
    p_hemisferio: 'sur',
  })
  expect(errorEscuela, `crear escuela ${etiqueta}`).toBeNull()
  expect(escuelaId).toBeTruthy()

  const { data: anio, error: errorAnio } = await cliente
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
  expect(errorAnio, `anio de ${etiqueta}`).toBeNull()

  const { data: epoca, error: errorEpoca } = await cliente
    .from('epocas')
    .insert({
      escuela_id: escuelaId,
      anio_id: anio!.id,
      nombre: `Epoca de ${etiqueta}`,
      inicio: '2026-03-02',
      fin: '2026-03-27',
    })
    .select('id')
    .single()
  expect(errorEpoca, `epoca de ${etiqueta}`).toBeNull()

  const { data: familia, error: errorFamilia } = await cliente
    .from('familias')
    .insert({ escuela_id: escuelaId, nombre: `Familia de ${etiqueta}` })
    .select('id')
    .single()
  expect(errorFamilia, `familia de ${etiqueta}`).toBeNull()

  const { data: nino, error: errorNino } = await cliente
    .from('ninos')
    .insert({
      escuela_id: escuelaId,
      familia_id: familia!.id,
      nombre: 'Nombre',
      apellidos: `De ${etiqueta}`,
      fecha_nacimiento: '2018-05-04',
    })
    .select('id')
    .single()
  expect(errorNino, `nino de ${etiqueta}`).toBeNull()

  // Ritmo: un encuentro, una minuta y una festividad, para que el aislamiento
  // se pruebe tambien sobre las tablas de la Fase 1.
  const { data: evento, error: errorEvento } = await cliente
    .from('eventos')
    .insert({
      escuela_id: escuelaId,
      anio_id: anio!.id,
      tipo: 'jornada',
      titulo: `Jornada de ${etiqueta}`,
      inicio: '2026-05-09T13:00:00Z',
      publico: true,
    })
    .select('id')
    .single()
  expect(errorEvento, `evento de ${etiqueta}`).toBeNull()

  const { error: errorMinuta } = await cliente.from('minutas').insert({
    escuela_id: escuelaId,
    epoca_id: epoca!.id,
    dia_semana: 1,
    plato: `Arroz de ${etiqueta}`,
  })
  expect(errorMinuta, `minuta de ${etiqueta}`).toBeNull()

  const { error: errorFestividad } = await cliente.from('festividades').insert({
    escuela_id: escuelaId,
    anio_id: anio!.id,
    nombre: `San Miguel de ${etiqueta}`,
    fecha: '2026-09-29',
  })
  expect(errorFestividad, `festividad de ${etiqueta}`).toBeNull()

  return {
    cliente,
    escuelaId: escuelaId as string,
    slug,
    anioId: anio!.id,
    epocaId: epoca!.id,
    familiaId: familia!.id,
    ninoId: nino!.id,
    eventoId: evento!.id,
  }
}

let a: Escuela
let b: Escuela

test.beforeAll(async () => {
  a = await montarEscuela('alfa')
  b = await montarEscuela('beta')
})

test('cada escuela ve sus propios datos', async () => {
  const { data: epocas } = await a.cliente.from('epocas').select('id, escuela_id')
  expect(epocas).toHaveLength(1)
  expect(epocas![0].escuela_id).toBe(a.escuelaId)
})

test('las tablas de dominio no filtran filas de la otra escuela', async () => {
  const tablas = [
    'escuelas',
    'anios_escolares',
    'epocas',
    'festividades',
    'eventos',
    'minutas',
    'familias',
    'ninos',
  ] as const

  for (const tabla of tablas) {
    const columna = tabla === 'escuelas' ? 'id' : 'escuela_id'
    const { data, error } = await a.cliente
      .from(tabla)
      .select(columna)
      .eq(columna, b.escuelaId)

    // Cero filas, NO un error: si esto fuera un error de permisos, la
    // politica estaria mal escrita.
    expect(error, `${tabla} deberia responder sin error`).toBeNull()
    expect(data, `${tabla} no debe devolver filas de la otra escuela`).toEqual([])
  }
})

test('leer un registro concreto de la otra escuela devuelve vacio', async () => {
  const { data: nino, error } = await a.cliente
    .from('ninos')
    .select('id')
    .eq('id', b.ninoId)
    .maybeSingle()

  expect(error).toBeNull()
  expect(nino).toBeNull()
})

test('la escuela ajena no se puede resolver por su slug', async () => {
  const { data, error } = await a.cliente
    .from('escuelas')
    .select('id')
    .eq('slug', b.slug)
    .maybeSingle()

  expect(error).toBeNull()
  expect(data).toBeNull()
})

test('no se puede escribir dentro de la otra escuela', async () => {
  const { error } = await a.cliente.from('epocas').insert({
    escuela_id: b.escuelaId,
    anio_id: b.anioId,
    nombre: 'Intrusa',
    inicio: '2026-06-01',
    fin: '2026-06-26',
  })

  // Aqui SI se espera error: escribir en otra escuela debe rebotar contra la
  // politica with check, no colarse en silencio.
  expect(error, 'insertar en la escuela ajena deberia fallar').not.toBeNull()
})

test('no se puede colgar una fila propia de un padre de la otra escuela', async () => {
  // B3: la RLS aprueba la fila porque escuela_id es la correcta. Lo que la
  // frena es la FK compuesta (anio_id, escuela_id).
  const { error } = await a.cliente.from('epocas').insert({
    escuela_id: a.escuelaId,
    anio_id: b.anioId,
    nombre: 'Padre robado',
    inicio: '2026-07-01',
    fin: '2026-07-24',
  })

  expect(error, 'la FK compuesta deberia rechazar el padre ajeno').not.toBeNull()
  expect(error?.code).toBe('23503')
})

test('no se puede darse membresia en la otra escuela', async () => {
  const { data: usuario } = await a.cliente.auth.getUser()

  const { error } = await a.cliente.from('membresias').insert({
    escuela_id: b.escuelaId,
    perfil_id: usuario.user!.id,
    rol: 'administracion',
  })

  expect(error, 'auto-asignarse un rol ajeno deberia fallar').not.toBeNull()
})

test('la auditoria de una escuela no es visible desde la otra', async () => {
  const { data, error } = await a.cliente
    .from('auditoria')
    .select('id')
    .eq('escuela_id', b.escuelaId)

  expect(error).toBeNull()
  expect(data).toEqual([])
})

test('B4: la auditoria propia de escuelas si es visible', async () => {
  // Antes de la correccion estas filas quedaban con escuela_id nulo y la
  // politica auditoria_select, que exige not null, las escondia para siempre.
  const { data, error } = await a.cliente
    .from('auditoria')
    .select('id, tabla')
    .eq('escuela_id', a.escuelaId)
    .eq('tabla', 'public.escuelas')

  expect(error).toBeNull()
  expect(data!.length).toBeGreaterThan(0)
})

test('el encuentro de la otra escuela no se ve ni por su id', async () => {
  const { data, error } = await a.cliente
    .from('eventos')
    .select('id')
    .eq('id', b.eventoId)
    .maybeSingle()

  expect(error).toBeNull()
  expect(data).toBeNull()
})

test('no se puede inscribir a nadie en un encuentro de la otra escuela', async () => {
  const { data: usuario } = await a.cliente.auth.getUser()

  const { error } = await a.cliente.from('evento_inscripciones').insert({
    escuela_id: a.escuelaId,
    evento_id: b.eventoId,
    perfil_id: usuario.user!.id,
  })

  // La FK compuesta (evento_id, escuela_id) lo hace imposible aunque la RLS
  // aprobara la fila: el evento no es de esta escuela.
  expect(error, 'inscribirse en un evento ajeno deberia fallar').not.toBeNull()
})
