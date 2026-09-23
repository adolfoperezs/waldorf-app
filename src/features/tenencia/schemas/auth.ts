import { z } from 'zod'

/**
 * Fase 0 del roadmap: email y contrasena. Nada de OAuth todavia.
 */

/**
 * Supabase exige 6 por defecto. Pedimos 10 sin reglas de composicion:
 * la longitud protege mas que obligar a un simbolo, y las reglas
 * arbitrarias empujan a la gente a reutilizar contrasenas.
 */
const contrasenaNueva = z
  .string()
  .min(10, 'Usa al menos 10 caracteres')
  .max(72, 'Máximo 72 caracteres')

export const credencialesSchema = z.object({
  email: z.email('Revisa el correo'),
  password: z.string().min(1, 'Escribe tu contraseña'),
})

export const registroSchema = z.object({
  nombreCompleto: z
    .string()
    .trim()
    .min(2, 'Escribe tu nombre')
    .max(120, 'El nombre es demasiado largo'),
  email: z.email('Revisa el correo'),
  password: contrasenaNueva,
})

export const recuperarSchema = z.object({
  email: z.email('Revisa el correo'),
})

export const nuevaContrasenaSchema = z
  .object({
    password: contrasenaNueva,
    confirmacion: z.string(),
  })
  .refine((d) => d.password === d.confirmacion, {
    error: 'Las dos contraseñas no coinciden',
    path: ['confirmacion'],
  })

export type Credenciales = z.infer<typeof credencialesSchema>
export type Registro = z.infer<typeof registroSchema>
