import 'server-only'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import type { Database } from '@/shared/supabase/tipos'
import { dentroDe, hoyEnEscuela } from '../lib/fechas'

/**
 * Consultas del ritmo.
 *
 * Igual que en tenencia: ningun filtro por escuela_id es un mecanismo de
 * seguridad. La RLS ya devuelve solo lo de las escuelas donde el usuario tiene
 * membresia vigente. Los `.eq('escuela_id', ...)` estan por rendimiento.
 *
 * Los eventos con `publico = false` los oculta la politica eventos_select, no
 * este codigo (correccion H6).
 */

type Tablas = Database['public']['Tables']

export type Anio = Tablas['anios_escolares']['Row']
export type Epoca = Tablas['epocas']['Row']
export type Festividad = Tablas['festividades']['Row']
export type Evento = Tablas['eventos']['Row']
export type Minuta = Tablas['minutas']['Row']

export async function aniosDeEscuela(escuelaId: string): Promise<Anio[]> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('anios_escolares')
    .select('*')
    .eq('escuela_id', escuelaId)
    .order('inicio', { ascending: false })
  return data ?? []
}

export async function anioActivo(escuelaId: string): Promise<Anio | null> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('anios_escolares')
    .select('*')
    .eq('escuela_id', escuelaId)
    .eq('activo', true)
    .maybeSingle()
  return data ?? null
}

export async function epocasDeAnio(anioId: string): Promise<Epoca[]> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('epocas')
    .select('*')
    .eq('anio_id', anioId)
    .order('inicio')
  return data ?? []
}

export async function epocaPorId(id: string): Promise<Epoca | null> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.from('epocas').select('*').eq('id', id).maybeSingle()
  return data ?? null
}

export async function festividadesDeAnio(anioId: string): Promise<Festividad[]> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('festividades')
    .select('*')
    .eq('anio_id', anioId)
    .order('fecha')
  return data ?? []
}

export async function minutaDeEpoca(epocaId: string): Promise<Minuta[]> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('minutas')
    .select('*')
    .eq('epoca_id', epocaId)
    .order('dia_semana')
  return data ?? []
}

/** Los proximos eventos visibles para quien consulta. */
export async function eventosProximos(
  escuelaId: string,
  limite = 8,
): Promise<Evento[]> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('eventos')
    .select('*')
    .eq('escuela_id', escuelaId)
    .gte('inicio', new Date().toISOString())
    .order('inicio')
    .limit(limite)
  return data ?? []
}

export async function eventosDeEscuela(escuelaId: string): Promise<Evento[]> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('eventos')
    .select('*')
    .eq('escuela_id', escuelaId)
    .order('inicio', { ascending: false })
  return data ?? []
}

export async function eventoPorId(id: string): Promise<Evento | null> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.from('eventos').select('*').eq('id', id).maybeSingle()
  return data ?? null
}

export type Inscripcion = Tablas['evento_inscripciones']['Row'] & {
  perfiles: { nombre_completo: string } | null
}

export async function inscripcionesDeEvento(eventoId: string): Promise<Inscripcion[]> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('evento_inscripciones')
    .select('*, perfiles(nombre_completo)')
    .eq('evento_id', eventoId)
  return (data as Inscripcion[]) ?? []
}

/**
 * Todo lo que necesita la vista de calendario de una familia, en una sola
 * pasada. Es la pantalla mas usada del sistema y el usuario tipico esta en un
 * telefono con mala senal: cuantos menos viajes, mejor.
 */
export async function calendario(escuela: {
  id: string
  zona_horaria: string
}) {
  const anio = await anioActivo(escuela.id)

  if (!anio) {
    return {
      anio: null,
      epocas: [] as Epoca[],
      epocaEnCurso: null as Epoca | null,
      festividades: [] as Festividad[],
      eventos: await eventosProximos(escuela.id),
      minuta: [] as Minuta[],
    }
  }

  const [epocas, festividades, eventos] = await Promise.all([
    epocasDeAnio(anio.id),
    festividadesDeAnio(anio.id),
    eventosProximos(escuela.id),
  ])

  const hoy = hoyEnEscuela(escuela.zona_horaria)

  // La epoca de escuela en curso. Las de grupo se muestran en su grupo.
  const epocaEnCurso =
    epocas.find((e) => e.grupo_id === null && dentroDe(hoy, e.inicio, e.fin)) ?? null

  const minuta = epocaEnCurso ? await minutaDeEpoca(epocaEnCurso.id) : []

  return { anio, epocas, epocaEnCurso, festividades, eventos, minuta }
}
