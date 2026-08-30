'use server'

import { revalidatePath } from 'next/cache'
import { mensajeDeError } from '@/shared/lib/errores-postgres'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import type { ContextoEscuela } from './contexto'

/**
 * La minuta de una epoca, los siete dias de una vez.
 *
 * Se guarda entera y no dia a dia: quien la escribe la piensa como una semana,
 * no como siete formularios. Un dia sin plato se borra, que es como se quita
 * un dia de la semana.
 *
 * `minutas` tiene unique (epoca_id, dia_semana), asi que el upsert resuelve
 * crear y actualizar en un solo viaje.
 */
export async function guardarMinuta(
  ctx: ContextoEscuela,
  epocaId: string,
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const conPlato: {
    escuela_id: string
    epoca_id: string
    dia_semana: number
    plato: string
    notas: string | null
  }[] = []
  const vacios: number[] = []

  for (let dia = 1; dia <= 7; dia += 1) {
    const plato = String(formData.get(`plato-${dia}`) ?? '').trim()
    const notas = String(formData.get(`notas-${dia}`) ?? '').trim()

    if (plato) {
      conPlato.push({
        escuela_id: ctx.escuelaId,
        epoca_id: epocaId,
        dia_semana: dia,
        plato: plato.slice(0, 200),
        notas: notas ? notas.slice(0, 500) : null,
      })
    } else {
      vacios.push(dia)
    }
  }

  const supabase = await crearClienteServidor()

  if (conPlato.length > 0) {
    const { error } = await supabase
      .from('minutas')
      .upsert(conPlato, { onConflict: 'epoca_id,dia_semana' })

    if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
  }

  if (vacios.length > 0) {
    const { error } = await supabase
      .from('minutas')
      .delete()
      .eq('epoca_id', epocaId)
      .in('dia_semana', vacios)

    if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
  }

  revalidatePath(`/${ctx.slug}`, 'layout')
  return { ok: true }
}
