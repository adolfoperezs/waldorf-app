import 'server-only'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { FORMATO_CODIGO } from '../lib/invitacion'

/**
 * Miembros e invitaciones de una escuela.
 *
 * Como siempre: los filtros por escuela_id son de rendimiento. Quien decide lo
 * que vuelve es la RLS. Las invitaciones solo las ve administracion
 * (invitaciones_admin); las membresias, administracion y colegio de maestros.
 */

export async function miembrosDeEscuela(escuelaId: string) {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('membresias')
    .select('id, rol, perfil_id, desde, perfiles(nombre_completo, email)')
    .eq('escuela_id', escuelaId)
    .eq('activa', true)
    .order('desde')
  return data ?? []
}

export async function invitacionesPendientes(escuelaId: string) {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('invitaciones')
    .select('id, rol, email, expira_en, created_at')
    .eq('escuela_id', escuelaId)
    .is('aceptada_en', null)
    .is('revocada_en', null)
    .order('created_at', { ascending: false })
  return data ?? []
}

/**
 * Lo que la persona invitada puede saber de su invitacion antes de aceptarla.
 * Null si el codigo no tiene formato valido o no existe.
 */
export async function verInvitacion(codigo: string) {
  if (!FORMATO_CODIGO.test(codigo)) return null

  const supabase = await crearClienteServidor()
  const { data } = await supabase.rpc('ver_invitacion', { p_token: codigo })
  return data?.[0] ?? null
}
