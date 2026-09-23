import { z } from 'zod'

/**
 * Validacion en el borde de las server actions de tenencia.
 *
 * El esquema Zod es la UNICA fuente de validacion de entrada: no se duplica
 * en el cliente (docs/ARCHITECTURE.md, seccion Convenciones).
 *
 * Estas reglas replican las CHECK de la migracion 0001. La base es la que
 * manda; esto existe para dar un mensaje humano antes de llegar a Postgres.
 */

/** Rutas del sistema que viven en la raiz, al mismo nivel que `/[slug]`. */
const SLUGS_RESERVADOS = ['login', 'signup', 'nueva-escuela', 'invitacion', 'auth', 'api']

/** Mismo patron que el CHECK de `escuelas.slug`. */
export const slugEscuela = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'El identificador necesita al menos 3 caracteres')
  .max(48, 'El identificador no puede pasar de 48 caracteres')
  .regex(
    /^[a-z0-9]+(-[a-z0-9]+)*$/,
    'Solo minúsculas, números y guiones simples entre palabras',
  )
  // Una escuela llamada "login" quedaria tapada por la pagina de login.
  .refine(
    (slug) => !SLUGS_RESERVADOS.includes(slug),
    'Ese identificador está reservado. Elige otro.',
  )

const zonaHoraria = z
  .string()
  .trim()
  .min(1, 'Elige una zona horaria')
  .refine((tz) => {
    // El calendario Waldorf es sensible al hemisferio y a la hora local: una
    // escuela chilena celebra San Juan en invierno y una alemana en verano.
    try {
      new Intl.DateTimeFormat('es', { timeZone: tz })
      return true
    } catch {
      return false
    }
  }, 'Zona horaria no reconocida')

export const crearEscuelaSchema = z.object({
  slug: slugEscuela,
  nombre: z
    .string()
    .trim()
    .min(2, 'El nombre es demasiado corto')
    .max(120, 'El nombre es demasiado largo'),
  pais: z
    .string()
    .trim()
    .toUpperCase()
    .length(2, 'Código de país de dos letras, como CL o DE'),
  zonaHoraria,
  idioma: z.string().trim().toLowerCase().min(2).max(8),
  moneda: z
    .string()
    .trim()
    .toUpperCase()
    .length(3, 'Código de moneda de tres letras, como CLP o EUR'),
  hemisferio: z.enum(['norte', 'sur'], {
    error: 'Indica si la escuela está en el hemisferio norte o sur',
  }),
})

export type CrearEscuela = z.infer<typeof crearEscuelaSchema>
