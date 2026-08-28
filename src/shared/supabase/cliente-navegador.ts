import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './tipos'

/** Cliente de Supabase para componentes de cliente. Usa la anon key. */
export function crearClienteNavegador() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
