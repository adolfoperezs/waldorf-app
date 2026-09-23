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
    .select('id, rol, perfil_id, desde, perfiles(nombre_completo)')
    .eq('escuela_id', escuelaId)
    .eq('activa', true)
    .order('desde')
  return data ?? []
}

/**
 * Correo y telefono de los miembros. Desde 0008 esas columnas no se leen por
 * la API (discrepancia P2): pasan por contactos_de_escuela, que solo responde
 * a administracion.
 */
export async function contactosDeEscuela(escuelaId: string) {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.rpc('contactos_de_escuela', { p_escuela: escuelaId })
  return new Map((data ?? []).map((c) => [c.perfil_id, c]))
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
  // La hora se mira aqui, al leer, y no al dibujar: un componente tiene que
  // dar lo mismo cada vez que se renderiza.
  const ahora = Date.now()
  return (data ?? []).map((inv) => ({
    ...inv,
    caducada: new Date(inv.expira_en).getTime() <= ahora,
  }))
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
