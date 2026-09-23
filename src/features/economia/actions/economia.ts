'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ContextoEscuela } from '@/features/ritmo/actions/contexto'
import { leerPlantilla, PLANTILLA_POR_DEFECTO } from '@/features/tenencia/lib/plantillas'
import { mensajeDeError } from '@/shared/lib/errores-postgres'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import {
  acuerdoSchema,
  aporteSchema,
  campanaSchema,
  misHorasSchema,
  tramoSchema,
} from '../schemas/economia'

/**
 * Acciones de economia.
 *
 * Quien puede lo decide la base: tramos, acuerdos y aportes en dinero son de
 * administracion; una familia solo registra y retira SUS horas, siempre como
 * `registrado` (0009, aportes_familia_registra). Los identificadores que
 * llegan ligados a la accion vienen del navegador: se validan igual.
 *
 * Cada UPDATE y DELETE lleva `.select()`: sin el, una fila que la RLS filtra
 * parece un exito (.claude/memory/reference/escollos-de-tests.md).
 */

const uuid = z.uuid()

function refrescar(ctx: ContextoEscuela) {
  revalidatePath(`/${ctx.slug}`, 'layout')
}

async function usuarioActual() {
  const supabase = await crearClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return { supabase, user }
}

const numero = (valor: FormDataEntryValue | null) => (valor === null ? '' : valor)

// ---------------------------------------------------------------------
// Tramos
// ---------------------------------------------------------------------

export async function cargarTramosDePlantilla(
  ctx: ContextoEscuela,
  anioId: string,
  _previo: EstadoFormulario,
  _formData: FormData,
): Promise<EstadoFormulario> {
  if (!uuid.safeParse(anioId).success) return { ...estadoInicial, error: 'Año no válido.' }

  let plantilla
  try {
    plantilla = await leerPlantilla(PLANTILLA_POR_DEFECTO)
  } catch {
    return { ...estadoInicial, error: 'No pudimos leer la plantilla base.' }
  }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.from('tramos_aporte').upsert(
    plantilla.tramos_aporte.map((tramo) => ({
      escuela_id: ctx.escuelaId,
      anio_id: anioId,
      nombre: tramo.nombre,
      monto_sugerido: tramo.monto_sugerido,
      horas_sugeridas: tramo.horas_sugeridas,
      orden: tramo.orden,
    })),
    { onConflict: 'anio_id,nombre', ignoreDuplicates: true },
  )

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
  refrescar(ctx)
  return { ok: true }
}

function datosDeTramo(formData: FormData) {
  return tramoSchema.safeParse({
    nombre: formData.get('nombre'),
    montoSugerido: numero(formData.get('montoSugerido')),
    horasSugeridas: numero(formData.get('horasSugeridas')),
  })
}

export async function crearTramo(
  ctx: ContextoEscuela,
  anioId: string,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analisis = datosDeTramo(formData)
  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const supabase = await crearClienteServidor()
  const { count } = await supabase
    .from('tramos_aporte')
    .select('id', { count: 'exact', head: true })
    .eq('anio_id', anioId)

  const { error } = await supabase.from('tramos_aporte').insert({
    escuela_id: ctx.escuelaId,
    anio_id: anioId,
    nombre: analisis.data.nombre,
    monto_sugerido: analisis.data.montoSugerido,
    horas_sugeridas: analisis.data.horasSugeridas,
    orden: (count ?? 0) + 1,
  })

  if (error) {
    if (error.code === '23505') {
      return { ...estadoInicial, errores: { nombre: ['Ya hay un tramo con ese nombre'] } }
    }
    return { ...estadoInicial, error: mensajeDeError(error.code) }
  }
  refrescar(ctx)
  return { ok: true }
}

export async function actualizarTramo(
  ctx: ContextoEscuela,
  tramoId: string,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analisis = datosDeTramo(formData)
  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const supabase = await crearClienteServidor()
  const { data, error } = await supabase
    .from('tramos_aporte')
    .update({
      nombre: analisis.data.nombre,
      monto_sugerido: analisis.data.montoSugerido,
      horas_sugeridas: analisis.data.horasSugeridas,
    })
    .eq('id', tramoId)
    .select('id')

  if (error) {
    if (error.code === '23505') {
      return { ...estadoInicial, errores: { nombre: ['Ya hay un tramo con ese nombre'] } }
    }
    return { ...estadoInicial, error: mensajeDeError(error.code) }
  }
  if (!data?.length) return { ...estadoInicial, error: mensajeDeError('42501') }
  refrescar(ctx)
  return { ok: true }
}

// ---------------------------------------------------------------------
// Acuerdos
// ---------------------------------------------------------------------

/** Crear o cambiar el acuerdo de una familia para un anio (uno por familia y anio). */
export async function guardarAcuerdo(
  ctx: ContextoEscuela,
  anioId: string,
  familiaId: string,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  if (!uuid.safeParse(anioId).success || !uuid.safeParse(familiaId).success) {
    return { ...estadoInicial, error: 'Datos no válidos.' }
  }

  const analisis = acuerdoSchema.safeParse({
    tramoId: formData.get('tramoId') ?? '',
    montoMensual: numero(formData.get('montoMensual')),
    horasMensuales: numero(formData.get('horasMensuales')),
    desde: formData.get('desde'),
    notas: formData.get('notas') ?? '',
  })
  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const d = analisis.data
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase
    .from('acuerdos_aporte')
    .upsert(
      {
        escuela_id: ctx.escuelaId,
        familia_id: familiaId,
        anio_id: anioId,
        tramo_id: d.tramoId || null,
        monto_mensual: d.montoMensual,
        horas_mensuales: d.horasMensuales,
        acordado_en: d.desde,
        notas: d.notas || null,
      },
      { onConflict: 'familia_id,anio_id' },
    )
    .select('id')

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
  if (!data?.length) return { ...estadoInicial, error: mensajeDeError('42501') }
  refrescar(ctx)
  return { ok: true }
}

// ---------------------------------------------------------------------
// Aportes
// ---------------------------------------------------------------------

/**
 * La administracion registra un aporte: dinero que llego a la cuenta, u
 * horas que vio. Queda confirmado de entrada.
 */
export async function registrarAporte(
  ctx: ContextoEscuela,
  anioId: string,
  familiaId: string,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  if (!uuid.safeParse(anioId).success || !uuid.safeParse(familiaId).success) {
    return { ...estadoInicial, error: 'Datos no válidos.' }
  }

  const analisis = aporteSchema.safeParse({
    moneda: formData.get('moneda'),
    cantidad: numero(formData.get('cantidad')),
    periodo: formData.get('periodo'),
    fecha: formData.get('fecha'),
    comisionId: formData.get('comisionId') ?? '',
    campanaId: formData.get('campanaId') ?? '',
    descripcion: formData.get('descripcion') ?? '',
  })
  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const { supabase, user } = await usuarioActual()
  if (!user) return { ...estadoInicial, error: 'Necesitas iniciar sesión.' }

  const d = analisis.data
  const { error } = await supabase.from('aportes').insert({
    escuela_id: ctx.escuelaId,
    familia_id: familiaId,
    anio_id: anioId,
    moneda: d.moneda,
    monto: d.moneda === 'dinero' ? d.cantidad : null,
    horas: d.moneda === 'horas' ? d.cantidad : null,
    periodo: d.periodo,
    fecha: d.fecha,
    comision_id: d.comisionId || null,
    campana_id: d.campanaId || null,
    descripcion: d.descripcion || null,
    estado: 'confirmado',
    registrado_por: user.id,
  })

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
  refrescar(ctx)
  return { ok: true }
}

async function cambiarEstado(
  ctx: ContextoEscuela,
  aporteId: string,
  estado: 'confirmado' | 'anulado',
): Promise<EstadoFormulario> {
  if (!uuid.safeParse(aporteId).success) return { ...estadoInicial, error: 'Aporte no válido.' }

  const supabase = await crearClienteServidor()
  const { data, error } = await supabase
    .from('aportes')
    .update({ estado })
    .eq('id', aporteId)
    .neq('estado', 'anulado')
    .select('id')

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
  if (!data?.length) return { ...estadoInicial, error: 'Ese aporte ya no se puede cambiar.' }
  refrescar(ctx)
  return { ok: true }
}

export async function confirmarAporte(
  ctx: ContextoEscuela,
  aporteId: string,
  _previo: EstadoFormulario,
  _formData: FormData,
): Promise<EstadoFormulario> {
  return cambiarEstado(ctx, aporteId, 'confirmado')
}

/**
 * Anular, no borrar: el registro economico se conserva (obligacion
 * tributaria, docs/PRIVACY.md) y la auditoria guarda quien lo anulo.
 */
export async function anularAporte(
  ctx: ContextoEscuela,
  aporteId: string,
  _previo: EstadoFormulario,
  _formData: FormData,
): Promise<EstadoFormulario> {
  return cambiarEstado(ctx, aporteId, 'anulado')
}

/** Una familia registra sus horas. Quedan por confirmar. */
export async function registrarMisHoras(
  ctx: ContextoEscuela,
  anioId: string,
  familiaId: string,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  if (!uuid.safeParse(anioId).success || !uuid.safeParse(familiaId).success) {
    return { ...estadoInicial, error: 'Datos no válidos.' }
  }

  const analisis = misHorasSchema.safeParse({
    horas: numero(formData.get('horas')),
    periodo: formData.get('periodo'),
    fecha: formData.get('fecha'),
    comisionId: formData.get('comisionId') ?? '',
    campanaId: formData.get('campanaId') ?? '',
    descripcion: formData.get('descripcion') ?? '',
  })
  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const { supabase, user } = await usuarioActual()
  if (!user) return { ...estadoInicial, error: 'Necesitas iniciar sesión.' }

  const d = analisis.data
  const { error } = await supabase.from('aportes').insert({
    escuela_id: ctx.escuelaId,
    familia_id: familiaId,
    anio_id: anioId,
    moneda: 'horas',
    horas: d.horas,
    periodo: d.periodo,
    fecha: d.fecha,
    comision_id: d.comisionId || null,
    campana_id: d.campanaId || null,
    descripcion: d.descripcion,
    estado: 'registrado',
    registrado_por: user.id,
  })

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
  refrescar(ctx)
  return { ok: true }
}

/** Retirar horas propias que nadie confirmo todavia. */
export async function retirarMisHoras(
  ctx: ContextoEscuela,
  aporteId: string,
  _previo: EstadoFormulario,
  _formData: FormData,
): Promise<EstadoFormulario> {
  if (!uuid.safeParse(aporteId).success) return { ...estadoInicial, error: 'Aporte no válido.' }

  const supabase = await crearClienteServidor()
  const { data, error } = await supabase
    .from('aportes')
    .delete()
    .eq('id', aporteId)
    .eq('estado', 'registrado')
    .select('id')

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
  if (!data?.length) {
    return { ...estadoInicial, error: 'Ya lo confirmaron: pide a la administración que lo corrija.' }
  }
  refrescar(ctx)
  return { ok: true }
}

// ---------------------------------------------------------------------
// Comision que ve el panel, y campanas
// ---------------------------------------------------------------------

/** Marca la comision que ve el panel economico. Vacio = ninguna. */
export async function elegirComisionEconomia(
  ctx: ContextoEscuela,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const elegida = formData.get('comisionId')
  if (elegida !== '' && !uuid.safeParse(elegida).success) {
    return { ...estadoInicial, error: 'Comisión no válida.' }
  }

  const supabase = await crearClienteServidor()
  const { error: errorQuitar } = await supabase
    .from('comisiones')
    .update({ ve_economia: false })
    .eq('escuela_id', ctx.escuelaId)
    .eq('ve_economia', true)
  if (errorQuitar) return { ...estadoInicial, error: mensajeDeError(errorQuitar.code) }

  if (elegida) {
    const { data, error } = await supabase
      .from('comisiones')
      .update({ ve_economia: true })
      .eq('id', elegida as string)
      .select('id')
    if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
    if (!data?.length) return { ...estadoInicial, error: mensajeDeError('42501') }
  }

  refrescar(ctx)
  return { ok: true }
}

export async function crearCampana(
  ctx: ContextoEscuela,
  anioId: string | null,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analisis = campanaSchema.safeParse({
    nombre: formData.get('nombre'),
    descripcion: formData.get('descripcion') ?? '',
    metaMonto: numero(formData.get('metaMonto')),
    metaHoras: numero(formData.get('metaHoras')),
    comisionId: formData.get('comisionId') ?? '',
    epocaId: formData.get('epocaId') ?? '',
    inicio: formData.get('inicio') ?? '',
    fin: formData.get('fin') ?? '',
  })
  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const d = analisis.data
  if (d.metaMonto === '' && d.metaHoras === '') {
    return {
      ...estadoInicial,
      errores: { metaMonto: ['Pon una meta en dinero, en horas o en las dos'] },
    }
  }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.from('campanas').insert({
    escuela_id: ctx.escuelaId,
    anio_id: anioId,
    nombre: d.nombre,
    descripcion: d.descripcion || null,
    meta_monto: typeof d.metaMonto === 'number' ? d.metaMonto : null,
    meta_horas: typeof d.metaHoras === 'number' ? d.metaHoras : null,
    comision_id: d.comisionId || null,
    epoca_id: d.epocaId || null,
    inicio: d.inicio || null,
    fin: d.fin || null,
  })

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
  refrescar(ctx)
  return { ok: true }
}

/** Cerrar una campana: deja de recibir aportes, su historia queda. */
export async function cerrarCampana(
  ctx: ContextoEscuela,
  campanaId: string,
  _previo: EstadoFormulario,
  _formData: FormData,
): Promise<EstadoFormulario> {
  if (!uuid.safeParse(campanaId).success) return { ...estadoInicial, error: 'Campaña no válida.' }

  const supabase = await crearClienteServidor()
  const { data, error } = await supabase
    .from('campanas')
    .update({ activa: false })
    .eq('id', campanaId)
    .select('id')

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
  if (!data?.length) return { ...estadoInicial, error: mensajeDeError('42501') }
  refrescar(ctx)
  return { ok: true }
}
