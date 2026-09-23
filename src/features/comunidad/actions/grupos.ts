'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ContextoEscuela } from '@/features/ritmo/actions/contexto'
import { hoyEnEscuela, sumarDias } from '@/features/ritmo/lib/fechas'
import { leerPlantilla, PLANTILLA_POR_DEFECTO } from '@/features/tenencia/lib/plantillas'
import { mensajeDeError } from '@/shared/lib/errores-postgres'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { cicloSchema, grupoSchema, guiaSchema } from '../schemas/comunidad'

/**
 * Ciclos, grupos y maestra guia.
 *
 * Escriben gestores (ciclos_write, grupos_write y grupo_maestros_write piden
 * es_gestor). Cada UPDATE lleva `.select()`: sin el, una fila que la RLS
 * filtra parece un exito (.claude/memory/reference/escollos-de-tests.md).
 */

function refrescar(ctx: ContextoEscuela) {
  revalidatePath(`/${ctx.slug}`, 'layout')
}

export async function crearCiclo(
  ctx: ContextoEscuela,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analisis = cicloSchema.safeParse({
    nombre: formData.get('nombre'),
    modalidad: formData.get('modalidad'),
    acento: formData.get('acento'),
  })
  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const supabase = await crearClienteServidor()
  const { count } = await supabase
    .from('ciclos')
    .select('id', { count: 'exact', head: true })
    .eq('escuela_id', ctx.escuelaId)

  const { error } = await supabase.from('ciclos').insert({
    escuela_id: ctx.escuelaId,
    ...analisis.data,
    orden: (count ?? 0) + 1,
  })

  if (error) {
    if (error.code === '23505') {
      return { ...estadoInicial, errores: { nombre: ['Ya hay un ciclo con ese nombre'] } }
    }
    return { ...estadoInicial, error: mensajeDeError(error.code) }
  }

  refrescar(ctx)
  return { ok: true }
}

/**
 * Carga los ciclos y grupos de la plantilla que falten.
 *
 * Idempotente: lo que ya existe (mismo nombre) no se toca ni se duplica, asi
 * que sirve tambien para completar una escuela a medio configurar. La
 * cohorte de cada grupo se calcula desde el anio del anio escolar activo.
 */
export async function cargarCiclosYGrupos(
  ctx: ContextoEscuela,
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

  if (plantilla.ciclos.length > 0) {
    const { error } = await supabase.from('ciclos').upsert(
      plantilla.ciclos.map((ciclo) => ({ escuela_id: ctx.escuelaId, ...ciclo })),
      { onConflict: 'escuela_id,nombre', ignoreDuplicates: true },
    )
    if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
  }

  const [{ data: ciclos }, { data: anio }] = await Promise.all([
    supabase.from('ciclos').select('id, nombre').eq('escuela_id', ctx.escuelaId),
    supabase
      .from('anios_escolares')
      .select('inicio')
      .eq('escuela_id', ctx.escuelaId)
      .eq('activo', true)
      .maybeSingle(),
  ])

  const idDeCiclo = new Map((ciclos ?? []).map((c) => [c.nombre, c.id]))
  const anioBase = Number((anio?.inicio ?? hoyEnEscuela(ctx.zonaHoraria)).slice(0, 4))

  if (plantilla.grupos.length > 0) {
    const { error } = await supabase.from('grupos').upsert(
      plantilla.grupos.map((grupo) => ({
        escuela_id: ctx.escuelaId,
        nombre: grupo.nombre,
        anio_cohorte: anioBase - grupo.desfase_cohorte,
        ciclo_id: idDeCiclo.get(grupo.ciclo) ?? null,
      })),
      { onConflict: 'escuela_id,nombre', ignoreDuplicates: true },
    )
    if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
  }

  refrescar(ctx)
  return { ok: true }
}

function datosDeGrupo(formData: FormData) {
  return grupoSchema.safeParse({
    nombre: formData.get('nombre'),
    cicloId: formData.get('cicloId') ?? '',
    anioCohorte: formData.get('anioCohorte'),
  })
}

export async function crearGrupo(
  ctx: ContextoEscuela,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analisis = datosDeGrupo(formData)
  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.from('grupos').insert({
    escuela_id: ctx.escuelaId,
    nombre: analisis.data.nombre,
    anio_cohorte: analisis.data.anioCohorte,
    ciclo_id: analisis.data.cicloId || null,
  })

  if (error) {
    if (error.code === '23505') {
      return { ...estadoInicial, errores: { nombre: ['Ya hay un grupo con ese nombre'] } }
    }
    return { ...estadoInicial, error: mensajeDeError(error.code) }
  }

  refrescar(ctx)
  return { ok: true }
}

/** Renombrar cada anio ("3° básico" pasa a "4° básico") o cambiar su ciclo. */
export async function actualizarGrupo(
  ctx: ContextoEscuela,
  grupoId: string,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analisis = datosDeGrupo(formData)
  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const supabase = await crearClienteServidor()
  const { data, error } = await supabase
    .from('grupos')
    .update({
      nombre: analisis.data.nombre,
      anio_cohorte: analisis.data.anioCohorte,
      ciclo_id: analisis.data.cicloId || null,
    })
    .eq('id', grupoId)
    .select('id')

  if (error) {
    if (error.code === '23505') {
      return { ...estadoInicial, errores: { nombre: ['Ya hay un grupo con ese nombre'] } }
    }
    return { ...estadoInicial, error: mensajeDeError(error.code) }
  }
  if (!data?.length) return { ...estadoInicial, error: mensajeDeError('42501') }

  refrescar(ctx)
  return { ok: true }
}

/**
 * Asignar la maestra o maestro guia de un grupo.
 *
 * La relacion es plurianual y tiene historia: no se sobrescribe. La guia
 * vigente termina ayer y la nueva empieza hoy, y la exclusion
 * grupo_un_guia_vigente garantiza que nunca haya dos a la vez. Si la vigente
 * se habia asignado hoy mismo, fue un error de tipeo y se borra.
 */
export async function asignarGuia(
  ctx: ContextoEscuela,
  grupoId: string,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analisis = guiaSchema.safeParse({ perfilId: formData.get('perfilId') })
  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const hoy = hoyEnEscuela(ctx.zonaHoraria)
  const supabase = await crearClienteServidor()

  const { data: vigentes } = await supabase
    .from('grupo_maestros')
    .select('id, perfil_id, desde')
    .eq('grupo_id', grupoId)
    .eq('tipo', 'guia')
    .or(`hasta.is.null,hasta.gte.${hoy}`)

  for (const vigente of vigentes ?? []) {
    if (vigente.perfil_id === analisis.data.perfilId) {
      return { ok: true } // Ya era la guia: nada que hacer.
    }

    const { data, error } =
      vigente.desde >= hoy
        ? await supabase.from('grupo_maestros').delete().eq('id', vigente.id).select('id')
        : await supabase
            .from('grupo_maestros')
            .update({ hasta: sumarDias(hoy, -1) })
            .eq('id', vigente.id)
            .select('id')

    if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
    if (!data?.length) return { ...estadoInicial, error: mensajeDeError('42501') }
  }

  const { error } = await supabase.from('grupo_maestros').insert({
    escuela_id: ctx.escuelaId,
    grupo_id: grupoId,
    perfil_id: analisis.data.perfilId,
    tipo: 'guia',
    desde: hoy,
  })

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }

  refrescar(ctx)
  return { ok: true }
}
