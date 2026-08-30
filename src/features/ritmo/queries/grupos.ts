import 'server-only'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'

/**
 * Los grupos de la escuela.
 *
 * `grupos` pertenece a comunidad (Fase 2), pero las epocas pueden ser de un
 * grupo concreto, asi que el ritmo necesita listarlos. Solo lectura: crearlos
 * y asignarles maestro-guia es trabajo de la Fase 2.
 */
export async function gruposDeEscuela(escuelaId: string) {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('grupos')
    .select('id, nombre')
    .eq('escuela_id', escuelaId)
    .eq('activo', true)
    .order('anio_cohorte')
  return data ?? []
}
