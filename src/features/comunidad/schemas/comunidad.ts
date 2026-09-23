import { z } from 'zod'
import { ACENTOS } from '@/shared/design/acentos'

/**
 * Validacion en el borde de las server actions de comunidad.
 *
 * Replica las CHECK de 0003 y 0007. La base es la que manda; esto existe para
 * dar un mensaje humano antes de llegar a Postgres.
 */

const idOVacio = z.union([z.uuid(), z.literal('')])

export const MODALIDADES = ['jardin', 'escolar'] as const

export const NOMBRE_MODALIDAD: Record<(typeof MODALIDADES)[number], string> = {
  jardin: 'Jardín (primer septenio)',
  escolar: 'Escolar (clase principal por épocas)',
}

export const DESCRIPCION_MODALIDAD: Record<(typeof MODALIDADES)[number], string> = {
  jardin:
    'Imitación, juego libre, cuento y ronda. Las familias ven el cuento de la semana, la actividad y el cereal del día, sin asignaturas.',
  escolar:
    'Clase principal por épocas y materias especiales. Las familias ven la época activa, el tema de la semana y las materias del día.',
}

export const cicloSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'Ponle un nombre, como "Grupo Semilla"')
    .max(60, 'El nombre es demasiado largo'),
  modalidad: z.enum(MODALIDADES, { error: 'Elige cómo se vive el ritmo en este ciclo' }),
  acento: z.enum(ACENTOS, { error: 'Elige un color' }),
})

export const grupoSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'Ponle un nombre al grupo')
    .max(80, 'El nombre es demasiado largo'),
  cicloId: idOVacio,
  anioCohorte: z.coerce
    .number({ error: 'Escribe un año' })
    .int('Escribe un año')
    .min(1990, 'Revisa el año')
    .max(2100, 'Revisa el año'),
})

export const guiaSchema = z.object({
  perfilId: z.uuid('Elige a la maestra o maestro guía'),
})

const correoOpcional = z
  .string()
  .trim()
  .toLowerCase()
  .refine((c) => c === '' || z.email().safeParse(c).success, 'Revisa el correo')

export const ninoSchema = z.object({
  nombre: z.string().trim().min(1, 'Escribe el nombre').max(80, 'Demasiado largo'),
  apellidos: z.string().trim().min(1, 'Escribe los apellidos').max(120, 'Demasiado largo'),
  fechaNacimiento: z.iso
    .date('Revisa la fecha')
    .refine((f) => f < new Date().toISOString().slice(0, 10), 'Revisa la fecha'),
  grupoId: idOVacio,
})

export const sumarFamiliaSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(2, 'Escribe cómo conoce la escuela a esta familia')
    .max(120, 'El nombre es demasiado largo'),
  correo: correoOpcional,
  ninos: z.array(ninoSchema).min(1, 'Suma al menos un niño o niña').max(8),
})

export const invitarIntegranteSchema = z.object({
  correo: correoOpcional,
})

export type Nino = z.infer<typeof ninoSchema>
