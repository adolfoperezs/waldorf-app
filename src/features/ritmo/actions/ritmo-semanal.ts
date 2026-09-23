'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { mensajeDeError } from '@/shared/lib/errores-postgres'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { diaRitmoSchema, semanaDeGrupoSchema, semanaSchema } from '../schemas/ritmo'
import type { ContextoEscuela } from './contexto'

/**
 * El ritmo semanal de un grupo: lo escribe su maestra (o un gestor) y lo
 * publica para las familias.
 *
 * Quien puede lo decide ritmos_semanales_write y ritmo_dias_write en la base
 * (app.puede_editar_ritmo). `grupoId` y `semana` llegan ligados a la accion,
 * o sea desde el navegador: se validan igual que un campo.
 *
 * Los upsert van con `.select()`: sin el, una fila que la RLS rechaza en
 * silencio parece un exito (escollos-de-tests).
 */

export type ContextoSemana = ContextoEscuela & { grupoId: string; semana: string }

type Supabase = Awaited<ReturnType<typeof crearClienteServidor>>

function refrescar(ctx: ContextoSemana) {
  revalidatePath(`/${ctx.slug}`, 'layout')
}

/** Crea la semana si no existe y devuelve su id. No toca lo ya escrito. */
async function asegurarSemana(supabase: Supabase, ctx: ContextoSemana) {
  const { data, error } = await supabase
    .from('ritmos_semanales')
    .upsert(
      { escuela_id: ctx.escuelaId, grupo_id: ctx.grupoId, semana: ctx.semana },
      { onConflict: 'grupo_id,semana' },
    )
    .select('id')
    .single()
  return { id: data?.id ?? null, error }
}

export async function guardarSemana(
  ctx: ContextoSemana,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  if (!semanaDeGrupoSchema.safeParse(ctx).success) {
    return { ...estadoInicial, error: 'Esta semana no es válida.' }
  }

  const analisis = semanaSchema.safeParse({
    tema: formData.get('tema') ?? '',
    recordatorio: formData.get('recordatorio') ?? '',
  })
  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const supabase = await crearClienteServidor()
  const { data, error } = await supabase
    .from('ritmos_semanales')
    .upsert(
      {
        escuela_id: ctx.escuelaId,
        grupo_id: ctx.grupoId,
        semana: ctx.semana,
        tema: analisis.data.tema || null,
        recordatorio: analisis.data.recordatorio || null,
      },
      { onConflict: 'grupo_id,semana' },
    )
    .select('id')

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
  if (!data?.length) return { ...estadoInicial, error: mensajeDeError('42501') }

  refrescar(ctx)
  return { ok: true }
}

export async function guardarDia(
  ctx: ContextoSemana,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  if (!semanaDeGrupoSchema.safeParse(ctx).success) {
    return { ...estadoInicial, error: 'Esta semana no es válida.' }
  }

  const analisis = diaRitmoSchema.safeParse({
    dia: formData.get('dia'),
    actividad: formData.get('actividad') ?? '',
    materias: formData.get('materias') ?? '',
    alimento: formData.get('alimento') ?? '',
    nota: formData.get('nota') ?? '',
  })
  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const supabase = await crearClienteServidor()
  const semana = await asegurarSemana(supabase, ctx)
  if (semana.error || !semana.id) {
    return { ...estadoInicial, error: mensajeDeError(semana.error?.code ?? '42501') }
  }

  const d = analisis.data
  const { data, error } = await supabase
    .from('ritmo_dias')
    .upsert(
      {
        escuela_id: ctx.escuelaId,
        ritmo_id: semana.id,
        dia_semana: d.dia,
        actividad: d.actividad || null,
        materias: d.materias,
        alimento: d.alimento || null,
        nota: d.nota || null,
      },
      { onConflict: 'ritmo_id,dia_semana' },
    )
    .select('id')

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
  if (!data?.length) return { ...estadoInicial, error: mensajeDeError('42501') }

  refrescar(ctx)
  return { ok: true }
}

/**
 * Publicar para las familias. Desde ese momento lo ve toda la comunidad
 * (ritmos_semanales_select), y los cambios posteriores se ven al instante.
 */
export async function publicarRitmo(
  ctx: ContextoSemana,
  _previo: EstadoFormulario,
  _formData: FormData,
): Promise<EstadoFormulario> {
  if (!semanaDeGrupoSchema.safeParse(ctx).success) {
    return { ...estadoInicial, error: 'Esta semana no es válida.' }
  }

  const supabase = await crearClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ...estadoInicial, error: 'Necesitas iniciar sesión.' }

  const { data, error } = await supabase
    .from('ritmos_semanales')
    .upsert(
      {
        escuela_id: ctx.escuelaId,
        grupo_id: ctx.grupoId,
        semana: ctx.semana,
        publicado_en: new Date().toISOString(),
        publicado_por: user.id,
      },
      { onConflict: 'grupo_id,semana' },
    )
    .select('id')

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
  if (!data?.length) return { ...estadoInicial, error: mensajeDeError('42501') }

  refrescar(ctx)
  return { ok: true }
}

/** Volver a borrador: las familias dejan de verla hasta que se publique otra vez. */
export async function retirarRitmo(
  ctx: ContextoSemana,
  _previo: EstadoFormulario,
  _formData: FormData,
): Promise<EstadoFormulario> {
  if (!semanaDeGrupoSchema.safeParse(ctx).success) {
    return { ...estadoInicial, error: 'Esta semana no es válida.' }
  }

  const supabase = await crearClienteServidor()
  const { data, error } = await supabase
    .from('ritmos_semanales')
    .update({ publicado_en: null, publicado_por: null })
    .eq('grupo_id', ctx.grupoId)
    .eq('semana', ctx.semana)
    .select('id')

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
  if (!data?.length) return { ...estadoInicial, error: mensajeDeError('42501') }

  refrescar(ctx)
  return { ok: true }
}
