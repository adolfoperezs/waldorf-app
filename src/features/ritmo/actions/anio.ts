'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { leerPlantilla, PLANTILLA_POR_DEFECTO } from '@/features/tenencia/lib/plantillas'
import { mensajeDeError } from '@/shared/lib/errores-postgres'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { anioSchema } from '../schemas/ritmo'
import type { ContextoEscuela } from './contexto'

/**
 * El anio escolar es la raiz del ritmo: epocas, festividades y eventos cuelgan
 * de el. Solo uno activo por escuela, y de eso se encarga el indice unico
 * parcial `anios_un_activo_por_escuela`.
 */

export async function crearAnio(
  ctx: ContextoEscuela,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analisis = anioSchema.safeParse({
    nombre: formData.get('nombre'),
    inicio: formData.get('inicio'),
    fin: formData.get('fin'),
  })

  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.from('anios_escolares').insert({
    escuela_id: ctx.escuelaId,
    nombre: analisis.data.nombre,
    inicio: analisis.data.inicio,
    fin: analisis.data.fin,
  })

  if (error) {
    if (error.code === '23505') {
      return { ...estadoInicial, errores: { nombre: ['Ya existe un anio con ese nombre'] } }
    }
    return { ...estadoInicial, error: mensajeDeError(error.code) }
  }

  revalidatePath(`/${ctx.slug}`, 'layout')
  return { ok: true }
}

/**
 * Activar es transaccional y va por RPC.
 *
 * Desactivar el anterior y activar el nuevo son dos escrituras: hechas desde
 * aqui como dos llamadas, entre una y otra la escuela se queda sin anio
 * activo, y si la segunda falla se queda asi. Ver 0004_ritmo_rpc.sql.
 */
export async function activarAnio(
  ctx: ContextoEscuela,
  anioId: string,
  _previo: EstadoFormulario,
  _formData: FormData,
): Promise<EstadoFormulario> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc('activar_anio', { p_anio: anioId })

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }

  revalidatePath(`/${ctx.slug}`, 'layout')
  return { ok: true }
}

/** Cerrar un anio: la escuela queda sin anio activo hasta que active otro. */
export async function cerrarAnio(
  ctx: ContextoEscuela,
  anioId: string,
  _previo: EstadoFormulario,
  _formData: FormData,
): Promise<EstadoFormulario> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase
    .from('anios_escolares')
    .update({ activo: false })
    .eq('id', anioId)

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }

  revalidatePath(`/${ctx.slug}`, 'layout')
  return { ok: true }
}

/**
 * Vuelca la plantilla de la escuela en un anio: epocas encadenadas con sus
 * huecos, festividades resueltas a fecha y minuta semanal.
 *
 * La plantilla se lee y se valida aqui, y viaja a Postgres como jsonb. La base
 * no lee archivos. Es idempotente: llamarla dos veces no duplica nada.
 */
export async function materializarPlantilla(
  ctx: ContextoEscuela,
  anioId: string,
  _previo: EstadoFormulario,
  _formData: FormData,
): Promise<EstadoFormulario> {
  let plantilla
  try {
    plantilla = await leerPlantilla(PLANTILLA_POR_DEFECTO)
  } catch {
    return { ...estadoInicial, error: 'No pudimos leer la plantilla base.' }
  }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.rpc('materializar_plantilla', {
    p_anio: anioId,
    p_plantilla: plantilla,
  })

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }

  revalidatePath(`/${ctx.slug}`, 'layout')
  return { ok: true }
}
