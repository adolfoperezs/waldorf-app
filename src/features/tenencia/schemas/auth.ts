import { z } from 'zod'

/**
 * Fase 0 del roadmap: email y contrasena. Nada de OAuth todavia.
 */

export const credencialesSchema = z.object({
  email: z.email('Revisa el correo'),
  password: z.string().min(1, 'Escribe tu contrasena'),
})

export const registroSchema = z.object({
  nombreCompleto: z
    .string()
    .trim()
    .min(2, 'Escribe tu nombre')
    .max(120, 'El nombre es demasiado largo'),
  email: z.email('Revisa el correo'),
  /**
   * Supabase exige 6 por defecto. Pedimos 10 sin reglas de composicion:
   * la longitud protege mas que obligar a un simbolo, y las reglas
   * arbitrarias empujan a la gente a reutilizar contrasenas.
   */
  password: z
    .string()
    .min(10, 'Usa al menos 10 caracteres')
    .max(72, 'Maximo 72 caracteres'),
})

export type Credenciales = z.infer<typeof credencialesSchema>
export type Registro = z.infer<typeof registroSchema>
