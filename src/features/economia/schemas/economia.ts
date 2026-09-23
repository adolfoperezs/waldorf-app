import { z } from 'zod'

/**
 * Validacion en el borde de las server actions de economia. Replica las
 * CHECK de 0003: montos y horas no negativos, un aporte es dinero u horas y
 * no las dos cosas.
 */

const idOVacio = z.union([z.uuid(), z.literal('')])

const dinero = (mensaje: string) =>
  z.coerce.number({ error: mensaje }).min(0, mensaje).max(9_999_999_999, 'Revisa el monto')

const horas = (mensaje: string) =>
  z.coerce.number({ error: mensaje }).min(0, mensaje).max(9999, 'Revisa las horas')

/** `<input type="month">` entrega 'YYYY-MM'; en la base el periodo es el dia 1. */
const mes = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Elige el mes')
  .transform((m) => `${m}-01`)

const textoOpcional = (max: number) => z.string().trim().max(max, 'Demasiado largo').optional()

export const tramoSchema = z.object({
  nombre: z.string().trim().min(1, 'Ponle un nombre').max(60, 'Demasiado largo'),
  montoSugerido: dinero('Escribe un monto, aunque sea 0'),
  horasSugeridas: horas('Escribe las horas, aunque sean 0'),
})

export const acuerdoSchema = z.object({
  tramoId: idOVacio,
  montoMensual: dinero('Escribe el aporte mensual, aunque sea 0'),
  horasMensuales: horas('Escribe las horas al mes, aunque sean 0'),
  desde: z.iso.date('Revisa la fecha'),
  notas: textoOpcional(500),
})

export const aporteSchema = z.object({
  moneda: z.enum(['dinero', 'horas'], { error: 'Elige si es dinero u horas' }),
  cantidad: z.coerce
    .number({ error: 'Escribe cuánto' })
    .positive('Tiene que ser mayor que cero')
    .max(9_999_999_999, 'Revisa la cantidad'),
  periodo: mes,
  fecha: z.iso.date('Revisa la fecha'),
  comisionId: idOVacio,
  campanaId: idOVacio,
  descripcion: textoOpcional(300),
})

/** Lo que registra una familia: solo horas (el dinero lo registra la administracion). */
export const misHorasSchema = z.object({
  horas: z.coerce
    .number({ error: 'Escribe cuántas horas' })
    .positive('Tiene que ser mayor que cero')
    .max(99, 'Revisa las horas'),
  periodo: mes,
  fecha: z.iso.date('Revisa la fecha'),
  comisionId: idOVacio,
  campanaId: idOVacio,
  descripcion: z.string().trim().min(2, 'Cuenta en pocas palabras qué hiciste').max(300),
})

export const campanaSchema = z
  .object({
    nombre: z.string().trim().min(2, 'Ponle un nombre').max(120, 'Demasiado largo'),
    descripcion: textoOpcional(1000),
    // El vacio va primero: z.coerce.number convierte '' en 0, y una meta
    // vacia no es una meta de cero.
    metaMonto: z.union([z.literal(''), dinero('Revisa la meta')]).optional(),
    metaHoras: z.union([z.literal(''), horas('Revisa la meta')]).optional(),
    comisionId: idOVacio,
    epocaId: idOVacio,
    inicio: z.union([z.iso.date('Revisa la fecha'), z.literal('')]).optional(),
    fin: z.union([z.iso.date('Revisa la fecha'), z.literal('')]).optional(),
  })
  .refine((d) => !d.inicio || !d.fin || d.fin >= d.inicio, {
    error: 'Tiene que terminar después de empezar',
    path: ['fin'],
  })
