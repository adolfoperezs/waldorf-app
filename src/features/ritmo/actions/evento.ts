'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { mensajeDeError } from '@/shared/lib/errores-postgres'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { instanteEnZona } from '../lib/fechas'
import { eventoSchema } from '../schemas/ritmo'
import type { ContextoEscuela } from './contexto'

export async function crearEvento(
  ctx: ContextoEscuela,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analisis = eventoSchema.safeParse({
    tipo: formData.get('tipo'),
    titulo: formData.get('titulo'),
    descripcion: formData.get('descripcion') ?? '',
    lugar: formData.get('lugar') ?? '',
    fecha: formData.get('fecha'),
    hora: formData.get('hora') ?? '',
    requiereInscripcion: formData.get('requiereInscripcion') === 'on',
    cupo: formData.get('cupo') ?? '',
    publico: formData.get('publico') === 'on',
  })

  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const d = analisis.data
  const supabase = await crearClienteServidor()

  const { error } = await supabase.from('eventos').insert({
    escuela_id: ctx.escuelaId,
    tipo: d.tipo,
    titulo: d.titulo,
    descripcion: d.descripcion || null,
    lugar: d.lugar || null,
    // La hora que escribe la administracion es la de la escuela, no la del
    // navegador. Ver instanteEnZona.
    inicio: instanteEnZona(d.fecha, d.hora || '09:00', ctx.zonaHoraria),
    requiere_inscripcion: d.requiereInscripcion,
    cupo: typeof d.cupo === 'number' ? d.cupo : null,
    publico: d.publico,
  })

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }

  revalidatePath(`/${ctx.slug}`, 'layout')
  return { ok: true }
}

/**
 * Inscribirse o darse de baja.
 *
 * La politica evento_inscripciones_propia deja que cada persona gestione su
 * propia inscripcion y solo la suya: `perfil_id = auth.uid()`.
 */
export async function alternarInscripcion(
  ctx: ContextoEscuela,
  eventoId: string,
  _previo: EstadoFormulario,
  _formData: FormData,
): Promise<EstadoFormulario> {
  const supabase = await crearClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { ...estadoInicial, error: 'Necesitas iniciar sesion.' }

  const { data: existente } = await supabase
    .from('evento_inscripciones')
    .select('id')
    .eq('evento_id', eventoId)
    .eq('perfil_id', user.id)
    .maybeSingle()

  const { error } = existente
    ? await supabase.from('evento_inscripciones').delete().eq('id', existente.id)
    : await supabase.from('evento_inscripciones').insert({
        escuela_id: ctx.escuelaId,
        evento_id: eventoId,
        perfil_id: user.id,
      })

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }

  revalidatePath(`/${ctx.slug}/eventos/${eventoId}`)
  return { ok: true }
}

/** Asistencia: la registra quien organiza, no quien asiste. */
export async function marcarAsistencia(
  ctx: ContextoEscuela,
  inscripcionId: string,
  eventoId: string,
  asistio: boolean,
  _previo: EstadoFormulario,
  _formData: FormData,
): Promise<EstadoFormulario> {
  const supabase = await crearClienteServidor()
  const { error } = await supabase
    .from('evento_inscripciones')
    .update({ asistio })
    .eq('id', inscripcionId)

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }

  revalidatePath(`/${ctx.slug}/eventos/${eventoId}`)
  return { ok: true }
}
