'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { mensajeDeError } from '@/shared/lib/errores-postgres'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { epocaSchema } from '../schemas/ritmo'
import type { ContextoEscuela } from './contexto'

/**
 * Las epocas de un mismo grupo no se solapan, y las de escuela tampoco entre
 * si. Lo impiden dos exclusion constraints de 0002_ritmo.sql, no este codigo.
 * Aqui solo se traduce el 23P01 a algo que una maestra entienda.
 */
export async function crearEpoca(
  ctx: ContextoEscuela,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analisis = epocaSchema.safeParse({
    anioId: formData.get('anioId'),
    grupoId: formData.get('grupoId') ?? '',
    nombre: formData.get('nombre'),
    tema: formData.get('tema') ?? '',
    orden: formData.get('orden'),
    inicio: formData.get('inicio'),
    fin: formData.get('fin'),
  })

  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const { anioId, grupoId, nombre, tema, orden, inicio, fin } = analisis.data
  const supabase = await crearClienteServidor()

  const { error } = await supabase.from('epocas').insert({
    escuela_id: ctx.escuelaId,
    anio_id: anioId,
    // Nulo = epoca de toda la escuela.
    grupo_id: grupoId ? grupoId : null,
    nombre,
    tema: tema || null,
    orden,
    inicio,
    fin,
  })

  if (error) {
    // 23P01: exclusion_violation. Es el error mas frecuente al planificar.
    if (error.code === '23P01') {
      return {
        ...estadoInicial,
        errores: {
          inicio: ['Estas fechas se cruzan con otra epoca. Elige otro rango.'],
        },
      }
    }
    return { ...estadoInicial, error: mensajeDeError(error.code) }
  }

  revalidatePath(`/${ctx.slug}`, 'layout')
  return { ok: true }
}

export async function eliminarEpoca(
  ctx: ContextoEscuela,
  epocaId: string,
  _previo: EstadoFormulario,
  _formData: FormData,
): Promise<EstadoFormulario> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase.from('epocas').delete().eq('id', epocaId)

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }

  revalidatePath(`/${ctx.slug}`, 'layout')
  return { ok: true }
}

/**
 * Editar una epoca: nombre, tema, orden y sobre todo FECHAS.
 *
 * Mover fechas es lo que mas se hace al planificar, y es justo lo que puede
 * chocar con otra epoca. La exclusion constraint se encarga; aqui se traduce.
 */
export async function actualizarEpoca(
  ctx: ContextoEscuela,
  epocaId: string,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analisis = epocaSchema.safeParse({
    anioId: formData.get('anioId'),
    grupoId: formData.get('grupoId') ?? '',
    nombre: formData.get('nombre'),
    tema: formData.get('tema') ?? '',
    orden: formData.get('orden'),
    inicio: formData.get('inicio'),
    fin: formData.get('fin'),
  })

  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const { grupoId, nombre, tema, orden, inicio, fin } = analisis.data
  const supabase = await crearClienteServidor()

  // El `.select()` no es decorativo: sin el, un UPDATE que no encuentra la fila
  // devuelve 204 sin error y la accion informa de un exito que no ocurrio.
  // Con RLS de por medio eso pasa cada vez que la politica filtra la fila.
  const { data, error } = await supabase
    .from('epocas')
    .update({
      grupo_id: grupoId ? grupoId : null,
      nombre,
      tema: tema || null,
      orden,
      inicio,
      fin,
    })
    .eq('id', epocaId)
    .select('id')

  if (!error && (data === null || data.length === 0)) {
    return {
      ...estadoInicial,
      error: 'No pudimos guardar la epoca. Puede que ya no exista.',
    }
  }

  if (error) {
    if (error.code === '23P01') {
      return {
        ...estadoInicial,
        errores: {
          inicio: ['Estas fechas se cruzan con otra epoca. Elige otro rango.'],
        },
      }
    }
    return { ...estadoInicial, error: mensajeDeError(error.code) }
  }

  revalidatePath(`/${ctx.slug}`, 'layout')
  return { ok: true }
}
