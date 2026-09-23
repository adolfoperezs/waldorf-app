import 'server-only'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import type { Database } from '@/shared/supabase/tipos'
import { DIAS_DE_CLASE, dentroDe, sumarDias } from '../lib/fechas'
import type { Epoca, Minuta } from './ritmo'

/**
 * El ritmo semanal de los grupos (0007) y lo que lo rodea: la epoca vigente
 * y la minuta de cada dia.
 *
 * La RLS decide que semanas se ven: el borrador solo quien puede editarlo, lo
 * publicado cualquier miembro. La vista de familia pide ademas `soloPublicado`
 * porque una apoderada que tambien es maestra no debe ver borradores en la
 * vista de su hija.
 */

type Tablas = Database['public']['Tables']

export type RitmoDia = Tablas['ritmo_dias']['Row']
export type RitmoSemanal = Tablas['ritmos_semanales']['Row'] & { ritmo_dias: RitmoDia[] }

/** Las semanas de estos grupos, con sus dias. */
export async function ritmosDeSemana(
  grupoIds: string[],
  semana: string,
  { soloPublicado }: { soloPublicado: boolean },
): Promise<Map<string, RitmoSemanal>> {
  if (grupoIds.length === 0) return new Map()

  const supabase = await crearClienteServidor()
  let consulta = supabase
    .from('ritmos_semanales')
    .select('*, ritmo_dias(*)')
    .in('grupo_id', grupoIds)
    .eq('semana', semana)
  if (soloPublicado) consulta = consulta.not('publicado_en', 'is', null)

  const { data } = await consulta
  return new Map((data ?? []).map((ritmo) => [ritmo.grupo_id, ritmo as RitmoSemanal]))
}

/**
 * Las epocas que tocan la semana (lunes a viernes): las de toda la escuela y
 * las de estos grupos.
 */
async function epocasDeLaSemana(
  escuelaId: string,
  grupoIds: string[],
  semana: string,
): Promise<Epoca[]> {
  const supabase = await crearClienteServidor()
  const filtroGrupo = ['grupo_id.is.null', ...grupoIds.map((id) => `grupo_id.eq.${id}`)]
  const { data } = await supabase
    .from('epocas')
    .select('*')
    .eq('escuela_id', escuelaId)
    .lte('inicio', sumarDias(semana, 4))
    .gte('fin', semana)
    .or(filtroGrupo.join(','))
    .order('inicio')
  return data ?? []
}

/** La epoca de un grupo en un dia: la suya si tiene, si no la de la escuela. */
export function epocaDelDia(epocas: Epoca[], grupoId: string, dia: string): Epoca | null {
  return (
    epocas.find((e) => e.grupo_id === grupoId && dentroDe(dia, e.inicio, e.fin)) ??
    epocas.find((e) => e.grupo_id === null && dentroDe(dia, e.inicio, e.fin)) ??
    null
  )
}

export type ContextoDeSemana = {
  epocas: Epoca[]
  /** Minuta por epoca y dia de la semana. */
  minuta: Map<string, Map<number, Minuta>>
}

/** Epocas y minutas de la semana, para resolver la epoca y el cereal de cada dia. */
export async function contextoDeSemana(
  escuelaId: string,
  grupoIds: string[],
  semana: string,
): Promise<ContextoDeSemana> {
  const epocas = await epocasDeLaSemana(escuelaId, grupoIds, semana)
  const minuta = new Map<string, Map<number, Minuta>>()
  if (epocas.length === 0) return { epocas, minuta }

  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('minutas')
    .select('*')
    .in(
      'epoca_id',
      epocas.map((e) => e.id),
    )

  for (const fila of data ?? []) {
    const porDia = minuta.get(fila.epoca_id) ?? new Map<number, Minuta>()
    porDia.set(fila.dia_semana, fila)
    minuta.set(fila.epoca_id, porDia)
  }
  return { epocas, minuta }
}

export type DiaDeRitmo = {
  dia: number
  fecha: string
  /** Lo que escribio la maestra, si lo hay. */
  registro: RitmoDia | null
  /** El cereal o plato del dia: el del ritmo, o el de la minuta de la epoca. */
  alimento: string | null
  /** Solo el de la minuta: lo que se muestra si la maestra no escribe otro. */
  alimentoMinuta: string | null
}

/** Los cinco dias de clase de un grupo, con el alimento ya resuelto. */
export function diasDeLaSemana(
  grupoId: string,
  semana: string,
  ritmo: RitmoSemanal | undefined,
  contexto: ContextoDeSemana,
): DiaDeRitmo[] {
  const porDia = new Map((ritmo?.ritmo_dias ?? []).map((d) => [d.dia_semana, d]))

  return DIAS_DE_CLASE.map((dia) => {
    const fecha = sumarDias(semana, dia - 1)
    const registro = porDia.get(dia) ?? null
    const epoca = epocaDelDia(contexto.epocas, grupoId, fecha)
    const deMinuta = (epoca && contexto.minuta.get(epoca.id)?.get(dia)?.plato) || null
    return { dia, fecha, registro, alimento: registro?.alimento ?? deMinuta, alimentoMinuta: deMinuta }
  })
}

/** Proximos encuentros de estos grupos: salidas pedagogicas, reuniones del curso. */
export async function eventosDeGrupos(
  escuelaId: string,
  grupoIds: string[],
  dias = 14,
) {
  if (grupoIds.length === 0) return []
  const supabase = await crearClienteServidor()
  const ahora = new Date()
  const hasta = new Date(ahora.getTime() + dias * 86_400_000)
  const { data } = await supabase
    .from('eventos')
    .select('id, titulo, inicio, lugar, grupo_id')
    .eq('escuela_id', escuelaId)
    .in('grupo_id', grupoIds)
    .gte('inicio', ahora.toISOString())
    .lte('inicio', hasta.toISOString())
    .order('inicio')
  return data ?? []
}
