'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ContextoEscuela } from '@/features/ritmo/actions/contexto'
import { mensajeDeError } from '@/shared/lib/errores-postgres'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'

/**
 * Comisiones y sus integrantes. Escriben los gestores (comisiones_write y
 * comision_miembros_write piden es_gestor, 0003).
 *
 * Integrar una comision da poder real: gestionar sus campanas (0003, H7) y,
 * si es la que ve la economia, ver el panel de agregados (0009).
 */

const uuid = z.uuid()

const comisionSchema = z.object({
  nombre: z.string().trim().min(2, 'Ponle un nombre').max(80, 'Demasiado largo'),
  descripcion: z.string().trim().max(300, 'Demasiado largo').optional(),
})

export async function crearComision(
  ctx: ContextoEscuela,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analisis = comisionSchema.safeParse({
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion') ?? '',
  })
  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.from('comisiones').insert({
    escuela_id: ctx.escuelaId,
    nombre: analisis.data.nombre,
    descripcion: analisis.data.descripcion || null,
  })

  if (error) {
    if (error.code === '23505') {
      return { ...estadoInicial, errores: { nombre: ['Ya hay una comisión con ese nombre'] } }
    }
    return { ...estadoInicial, error: mensajeDeError(error.code) }
  }
  revalidatePath(`/${ctx.slug}`, 'layout')
  return { ok: true }
}

export async function sumarIntegrante(
  ctx: ContextoEscuela,
  comisionId: string,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const perfilId = formData.get('perfilId')
  if (!uuid.safeParse(comisionId).success || !uuid.safeParse(perfilId).success) {
    return { ...estadoInicial, errores: { perfilId: ['Elige a una persona'] } }
  }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.from('comision_miembros').insert({
    escuela_id: ctx.escuelaId,
    comision_id: comisionId,
    perfil_id: perfilId as string,
    coordina: formData.get('coordina') === 'on',
  })

  if (error) {
    if (error.code === '23505') {
      return { ...estadoInicial, errores: { perfilId: ['Ya integra esta comisión'] } }
    }
    return { ...estadoInicial, error: mensajeDeError(error.code) }
  }
  revalidatePath(`/${ctx.slug}`, 'layout')
  return { ok: true }
}

export async function quitarIntegrante(
  ctx: ContextoEscuela,
  integranteId: string,
  _previo: EstadoFormulario,
  _formData: FormData,
): Promise<EstadoFormulario> {
  if (!uuid.safeParse(integranteId).success) return { ...estadoInicial, error: 'No válido.' }

  const supabase = await crearClienteServidor()
  const { data, error } = await supabase
    .from('comision_miembros')
    .delete()
    .eq('id', integranteId)
    .select('id')

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
  if (!data?.length) return { ...estadoInicial, error: mensajeDeError('42501') }
  revalidatePath(`/${ctx.slug}`, 'layout')
  return { ok: true }
}
