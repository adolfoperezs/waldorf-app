import { z } from 'zod'

/**
 * Validacion en el borde de las server actions del ritmo.
 *
 * Replica las CHECK de 0002_ritmo.sql. La base es la que manda; esto existe
 * para dar un mensaje humano antes de llegar a Postgres.
 */

const fecha = z.iso.date('Revisa la fecha')

const rango = <T extends { inicio: string; fin: string }>(datos: T) =>
  datos.fin >= datos.inicio

export const anioSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, 'Ponle un nombre al anio, como "2026"')
      .max(60, 'El nombre es demasiado largo'),
    inicio: fecha,
    fin: fecha,
  })
  .refine((d) => d.fin > d.inicio, {
    error: 'El anio tiene que terminar despues de empezar',
    path: ['fin'],
  })

export const epocaSchema = z
  .object({
    anioId: z.uuid(),
    /** Vacio = epoca de toda la escuela. Ver docs/DOMAIN.md. */
    grupoId: z.union([z.uuid(), z.literal('')]).optional(),
    nombre: z
      .string()
      .trim()
      .min(2, 'Ponle un nombre a la epoca')
      .max(120, 'El nombre es demasiado largo'),
    tema: z.string().trim().max(500).optional(),
    orden: z.coerce.number().int().min(1).max(99),
    inicio: fecha,
    fin: fecha,
  })
  .refine(rango, {
    error: 'La epoca tiene que terminar el mismo dia o despues de empezar',
    path: ['fin'],
  })

/**
 * Tipos de evento. Es uno de los pocos `enum` legitimos: son estructurales,
 * no vocabulario pedagogico configurable (ver waldorf-domain).
 */
export const TIPOS_EVENTO = [
  'jornada',
  'asamblea',
  'encuentro_1a1',
  'taller',
  'reunion_comision',
  'festividad',
  'otro',
] as const

export const NOMBRE_TIPO_EVENTO: Record<(typeof TIPOS_EVENTO)[number], string> = {
  jornada: 'Jornada comunitaria',
  asamblea: 'Asamblea',
  encuentro_1a1: 'Encuentro uno a uno',
  taller: 'Taller',
  reunion_comision: 'Reunion de comision',
  festividad: 'Festividad',
  otro: 'Otro',
}

export const eventoSchema = z.object({
  tipo: z.enum(TIPOS_EVENTO, { error: 'Elige el tipo de encuentro' }),
  titulo: z.string().trim().min(2, 'Ponle un titulo').max(200),
  descripcion: z.string().trim().max(2000).optional(),
  lugar: z.string().trim().max(200).optional(),
  /** Fecha y hora locales de la escuela; se convierten en la server action. */
  fecha: z.iso.date('Revisa la fecha'),
  hora: z.iso.time({ precision: -1 }).or(z.literal('')).optional(),
  requiereInscripcion: z.coerce.boolean().default(false),
  cupo: z.union([z.coerce.number().int().positive(), z.literal('')]).optional(),
  /** false = solo el equipo. Lo aplica la politica eventos_select (H6). */
  publico: z.coerce.boolean().default(true),
})

export const minutaSchema = z.object({
  epocaId: z.uuid(),
  diaSemana: z.coerce.number().int().min(1).max(7),
  plato: z.string().trim().min(1, 'Escribe el plato').max(200),
  notas: z.string().trim().max(500).optional(),
})

export type NuevoAnio = z.infer<typeof anioSchema>
export type NuevaEpoca = z.infer<typeof epocaSchema>
export type NuevoEvento = z.infer<typeof eventoSchema>
