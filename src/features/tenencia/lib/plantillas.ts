import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'

/**
 * Plantillas de escuela.
 *
 * La capa configurable de docs/ARCHITECTURE.md: todo lo que cada escuela hace
 * distinto, expresado como DATO. Una escuela nueva clona una plantilla en el
 * onboarding y la ajusta.
 *
 * Los archivos viven en supabase/seed/plantillas/ y se validan al leerlos: son
 * datos editables a mano y un JSON mal formado no debe llegar a la base.
 */

export const plantillaSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  descripcion: z.string().optional(),
  pais: z.string().length(2),
  hemisferio: z.enum(['norte', 'sur']),
  idioma: z.string(),
  moneda: z.string().length(3),

  comisiones: z.array(
    z.object({
      nombre: z.string(),
      descripcion: z.string().optional(),
      /** Sus integrantes ven el panel economico (0009). */
      ve_economia: z.boolean().default(false),
    }),
  ),

  /**
   * Etapas de la escuela y sus grupos (0007). `modalidad` es estructural;
   * nombre y acento son de cada escuela. Un grupo apunta a su ciclo por
   * nombre, y su cohorte se calcula al cargarlo: anio base - desfase.
   */
  ciclos: z
    .array(
      z.object({
        orden: z.number().int(),
        nombre: z.string(),
        modalidad: z.enum(['jardin', 'escolar']),
        acento: z.enum(['salvia', 'ocre', 'arcilla', 'tierra']),
      }),
    )
    .default([]),
  grupos: z
    .array(
      z.object({
        nombre: z.string(),
        ciclo: z.string(),
        desfase_cohorte: z.number().int().min(0),
      }),
    )
    .default([]),

  /** Se materializan al crear el ano escolar, en la Fase 1. */
  epocas: z.array(
    z.object({ orden: z.number().int(), nombre: z.string(), semanas: z.number().int() }),
  ),
  festividades: z.array(
    z.object({
      nombre: z.string(),
      mes: z.number().int().min(1).max(12),
      dia: z.number().int().min(1).max(31),
      descripcion: z.string().optional(),
    }),
  ),
  tramos_aporte: z.array(
    z.object({
      orden: z.number().int(),
      nombre: z.string(),
      monto_sugerido: z.number().nonnegative(),
      horas_sugeridas: z.number().nonnegative(),
    }),
  ),
  minuta: z.array(
    z.object({
      dia_semana: z.number().int().min(1).max(7),
      plato: z.string(),
      notas: z.string().optional(),
    }),
  ),
})

export type Plantilla = z.infer<typeof plantillaSchema>

export const PLANTILLA_POR_DEFECTO = 'kimun-cl'

/** Lee y valida una plantilla por su id. */
export async function leerPlantilla(id: string): Promise<Plantilla> {
  // El id se usa para construir una ruta: se acota a un patron seguro para que
  // no pueda salir de la carpeta de plantillas.
  if (!/^[a-z0-9-]+$/.test(id)) {
    throw new Error('Identificador de plantilla invalido')
  }

  const ruta = path.join(process.cwd(), 'supabase', 'seed', 'plantillas', `${id}.json`)
  const bruto = await readFile(ruta, 'utf8')

  return plantillaSchema.parse(JSON.parse(bruto))
}
