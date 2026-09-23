import 'server-only'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import type { Database } from '@/shared/supabase/tipos'

/**
 * Consultas de comunidad: ciclos, grupos, maestros, familias y ninos.
 *
 * Como en el resto del sistema, los filtros por escuela_id son de
 * rendimiento: quien decide lo que vuelve es la RLS.
 *
 * Los ninos NUNCA se leen de la tabla directo: pasan por ninos_de_mi_familia
 * y ninos_de_escuela, que registran cada lectura en la auditoria (nivel
 * Menor, docs/PRIVACY.md; ver 0007_ciclos_ritmo_familias.sql).
 */

type Enums = Database['public']['Enums']

export type Modalidad = Enums['modalidad_ciclo']

export type Ciclo = {
  id: string
  nombre: string
  modalidad: Modalidad
  acento: string
  orden: number
}

export type GrupoConCiclo = {
  id: string
  nombre: string
  anio_cohorte: number
  ciclo_id: string | null
  ciclo: { nombre: string; modalidad: Modalidad; acento: string } | null
}

export type Guia = { grupoId: string; perfilId: string; nombre: string; desde: string }

const COLUMNAS_GRUPO =
  'id, nombre, anio_cohorte, ciclo_id, ciclo:ciclos!grupos_ciclo_fk(nombre, modalidad, acento)'

export async function ciclosDeEscuela(escuelaId: string): Promise<Ciclo[]> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('ciclos')
    .select('id, nombre, modalidad, acento, orden')
    .eq('escuela_id', escuelaId)
    .order('orden')
  return data ?? []
}

/** Los grupos activos, con su ciclo, ordenados por ciclo y de menor a mayor. */
export async function gruposConCiclo(escuelaId: string): Promise<GrupoConCiclo[]> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('grupos')
    .select(COLUMNAS_GRUPO)
    .eq('escuela_id', escuelaId)
    .eq('activo', true)
    .order('anio_cohorte', { ascending: false })
    .order('nombre')
  return (data as GrupoConCiclo[] | null) ?? []
}

export async function gruposPorIds(ids: string[]): Promise<GrupoConCiclo[]> {
  if (ids.length === 0) return []
  const supabase = await crearClienteServidor()
  const { data } = await supabase.from('grupos').select(COLUMNAS_GRUPO).in('id', ids)
  return (data as GrupoConCiclo[] | null) ?? []
}

/** Maestros guia vigentes hoy, uno por grupo como mucho (invariante 4). */
export async function guiasVigentes(escuelaId: string, hoy: string): Promise<Guia[]> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('grupo_maestros')
    .select('grupo_id, perfil_id, desde, perfiles(nombre_completo)')
    .eq('escuela_id', escuelaId)
    .eq('tipo', 'guia')
    .lte('desde', hoy)
    .or(`hasta.is.null,hasta.gte.${hoy}`)
  return (data ?? []).map((fila) => ({
    grupoId: fila.grupo_id,
    perfilId: fila.perfil_id,
    nombre: fila.perfiles?.nombre_completo ?? 'Sin nombre',
    desde: fila.desde,
  }))
}

/** Los grupos donde esta persona es maestra vigente (guia o especialidad). */
export async function idsDeMisGrupos(
  escuelaId: string,
  perfilId: string,
  hoy: string,
): Promise<string[]> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('grupo_maestros')
    .select('grupo_id')
    .eq('escuela_id', escuelaId)
    .eq('perfil_id', perfilId)
    .lte('desde', hoy)
    .or(`hasta.is.null,hasta.gte.${hoy}`)
  return [...new Set((data ?? []).map((fila) => fila.grupo_id))]
}

/** Quienes pueden ser maestra guia: miembros con un rol del equipo pedagogico. */
export async function maestrosDisponibles(escuelaId: string) {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('membresias')
    .select('perfil_id, perfiles(nombre_completo)')
    .eq('escuela_id', escuelaId)
    .eq('activa', true)
    .in('rol', ['maestro_guia', 'maestro_especialidad', 'colegio_maestros'])

  const porPersona = new Map<string, string>()
  for (const fila of data ?? []) {
    porPersona.set(fila.perfil_id, fila.perfiles?.nombre_completo ?? 'Sin nombre')
  }
  return [...porPersona.entries()]
    .map(([id, nombre]) => ({ id, nombre }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}

// ---------------------------------------------------------------------
// Familias y ninos
// ---------------------------------------------------------------------

export async function familiasDeEscuela(escuelaId: string) {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('familias')
    .select(
      'id, nombre, ingreso, familia_miembros(id, perfil_id, principal, perfiles(nombre_completo))',
    )
    .eq('escuela_id', escuelaId)
    .eq('activa', true)
    .order('nombre')
  return data ?? []
}

/** Invitaciones de familia sin aceptar ni revocar. Solo las ve administracion. */
export async function invitacionesDeFamilias(escuelaId: string) {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('invitaciones')
    .select('id, familia_id, email, expira_en')
    .eq('escuela_id', escuelaId)
    .not('familia_id', 'is', null)
    .is('aceptada_en', null)
    .is('revocada_en', null)
    .order('created_at', { ascending: false })
  return data ?? []
}

/** Todos los ninos de la escuela. Solo devuelve filas a administracion. Auditada. */
export async function ninosDeEscuela(escuelaId: string) {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.rpc('ninos_de_escuela', { p_escuela: escuelaId })
  return data ?? []
}

/** Los hijos de quien consulta en esta escuela. Auditada. */
export async function ninosDeMiFamilia(escuelaId: string) {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.rpc('ninos_de_mi_familia', { p_escuela: escuelaId })
  return data ?? []
}
