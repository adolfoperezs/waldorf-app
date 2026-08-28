import 'server-only'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import type { Database } from '@/shared/supabase/tipos'

/**
 * Consultas de tenencia.
 *
 * Ninguna filtra por escuela en TypeScript por seguridad. La RLS de Postgres
 * ya devuelve solo las filas de escuelas donde el usuario tiene membresia
 * vigente: si `escuelaPorSlug` no encuentra nada, es porque la persona no
 * pertenece a esa escuela o porque no existe, y desde fuera son
 * indistinguibles a proposito.
 */

// Tipos generados desde el esquema, nunca escritos a mano (CLAUDE.md, regla 4).
// Se regeneran con `npm run db:tipos`.
type FilaEscuela = Database['public']['Tables']['escuelas']['Row']

/** Solo las columnas que la interfaz necesita, derivadas del esquema. */
export type Escuela = Pick<
  FilaEscuela,
  'id' | 'slug' | 'nombre' | 'pais' | 'zona_horaria' | 'idioma' | 'moneda' | 'hemisferio'
>
export type Rol = Database['public']['Enums']['rol_escuela']

/**
 * Escuela por slug, o null si el usuario no puede verla.
 *
 * El `.eq('slug', slug)` es un filtro de conveniencia, no un mecanismo de
 * aislamiento (tenancy-guard: "puede estar por rendimiento, jamas por
 * seguridad"). Quien aisla es la politica escuelas_select.
 */
export async function escuelaPorSlug(slug: string): Promise<Escuela | null> {
  const supabase = await crearClienteServidor()

  const { data } = await supabase
    .from('escuelas')
    .select('id, slug, nombre, pais, zona_horaria, idioma, moneda, hemisferio')
    .eq('slug', slug)
    .maybeSingle()

  return data ?? null
}

/** Escuelas donde la persona tiene membresia vigente, para el selector. */
export async function misEscuelas(): Promise<Pick<Escuela, 'id' | 'slug' | 'nombre'>[]> {
  const supabase = await crearClienteServidor()

  const { data } = await supabase
    .from('escuelas')
    .select('id, slug, nombre')
    .order('nombre')

  return data ?? []
}

/** Roles de la persona en una escuela. Vacio si no es miembro. */
export async function misRoles(escuelaId: string): Promise<Rol[]> {
  const supabase = await crearClienteServidor()

  const { data } = await supabase
    .from('membresias')
    .select('rol')
    .eq('escuela_id', escuelaId)
    .eq('activa', true)

  return (data ?? []).map((fila) => fila.rol)
}
