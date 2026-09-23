import 'server-only'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import type { Database } from '@/shared/supabase/tipos'

/**
 * Consultas de economia.
 *
 * La RLS decide lo que vuelve: la administracion ve todo; una familia, su
 * acuerdo y sus aportes; nadie mas. La comision de economia NO lee filas de
 * familias: ve sumas por resumen_economico (0009). Los filtros por escuela o
 * anio son de rendimiento.
 */

type Tablas = Database['public']['Tables']

export type Tramo = Tablas['tramos_aporte']['Row']
export type Acuerdo = Tablas['acuerdos_aporte']['Row']
export type Aporte = Tablas['aportes']['Row']
export type Campana = Tablas['campanas']['Row']

export async function tramosDeAnio(anioId: string): Promise<Tramo[]> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('tramos_aporte')
    .select('*')
    .eq('anio_id', anioId)
    .order('orden')
  return data ?? []
}

export async function acuerdosDeAnio(anioId: string, familiaId?: string): Promise<Acuerdo[]> {
  const supabase = await crearClienteServidor()
  let consulta = supabase.from('acuerdos_aporte').select('*').eq('anio_id', anioId)
  if (familiaId) consulta = consulta.eq('familia_id', familiaId)
  const { data } = await consulta
  return data ?? []
}

export async function aportesDeAnio(anioId: string, familiaId?: string): Promise<Aporte[]> {
  const supabase = await crearClienteServidor()
  let consulta = supabase
    .from('aportes')
    .select('*')
    .eq('anio_id', anioId)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
  if (familiaId) consulta = consulta.eq('familia_id', familiaId)
  const { data } = await consulta
  return data ?? []
}

/** Agregados por mes, sin familias. Vacio si quien pregunta no ve economia. */
export async function resumenEconomico(anioId: string) {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.rpc('resumen_economico', { p_anio: anioId })
  return data ?? []
}

export async function comisionesDeEscuela(escuelaId: string) {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('comisiones')
    .select('id, nombre, ve_economia')
    .eq('escuela_id', escuelaId)
    .eq('activa', true)
    .order('nombre')
  return data ?? []
}

export async function campanasDeEscuela(escuelaId: string): Promise<Campana[]> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('campanas')
    .select('*')
    .eq('escuela_id', escuelaId)
    .order('activa', { ascending: false })
    .order('created_at', { ascending: false })
  return data ?? []
}

/** Cuanto lleva cada campana, en sumas. Lo ve toda la comunidad. */
export async function avanceDeCampanas(escuelaId: string) {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.rpc('avance_de_campanas', { p_escuela: escuelaId })
  return new Map((data ?? []).map((a) => [a.campana_id, a]))
}

/** La familia de quien consulta en esta escuela (la primera, si hubiera varias). */
export async function miFamilia(escuelaId: string, perfilId: string) {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('familia_miembros')
    .select('familia_id, familias(nombre)')
    .eq('escuela_id', escuelaId)
    .eq('perfil_id', perfilId)
    .limit(1)
    .maybeSingle()
  return data ? { id: data.familia_id, nombre: data.familias?.nombre ?? 'Tu familia' } : null
}

/** Las comisiones de las que es parte quien consulta. */
export async function misComisiones(escuelaId: string, perfilId: string) {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('comision_miembros')
    .select('comision_id, comisiones(nombre, ve_economia)')
    .eq('escuela_id', escuelaId)
    .eq('perfil_id', perfilId)
  return (data ?? []).map((fila) => ({
    id: fila.comision_id,
    nombre: fila.comisiones?.nombre ?? 'Comisión',
    veEconomia: fila.comisiones?.ve_economia ?? false,
  }))
}
