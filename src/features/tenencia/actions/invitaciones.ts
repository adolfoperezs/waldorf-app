'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { mensajeDeError } from '@/shared/lib/errores-postgres'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { FORMATO_CODIGO, generarCodigo } from '../lib/invitacion'
import { NOMBRE_ROL } from '../lib/roles'
import { textoInvitacion } from '../lib/texto-invitacion'
import { invitacionSchema } from '../schemas/invitacion'

type ContextoAdmin = { escuelaId: string; slug: string; escuelaNombre: string }

export type EstadoInvitacion = EstadoFormulario & {
  /** El enlace se devuelve UNA vez: la base solo guarda su huella. */
  enlace?: string
  texto?: string
}

/** Origen publico del sitio, para armar el enlace. */
async function origen(): Promise<string> {
  const configurado = process.env.NEXT_PUBLIC_SITE_URL
  if (configurado) return configurado.replace(/\/$/, '')

  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const protocolo = h.get('x-forwarded-proto') ?? 'https'
  return `${protocolo}://${host}`
}

/**
 * Crea una invitacion por enlace.
 *
 * El codigo se genera aqui y a la base solo viaja su huella. La insercion pasa
 * por la RLS normal: invitaciones_admin exige administracion, igual que
 * membresias_admin, porque invitar es conceder una membresia por adelantado.
 */
export async function crearInvitacion(
  ctx: ContextoAdmin,
  _previo: EstadoInvitacion,
  formData: FormData,
): Promise<EstadoInvitacion> {
  const analisis = invitacionSchema.safeParse({
    rol: formData.get('rol'),
    correo: formData.get('correo') ?? '',
  })

  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const { rol, correo } = analisis.data
  const supabase = await crearClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ...estadoInicial, error: 'Necesitas iniciar sesion.' }

  const { codigo, huella } = generarCodigo()

  // `.select()` para no confundir "la RLS filtro la fila" con exito.
  const { data, error } = await supabase
    .from('invitaciones')
    .insert({
      escuela_id: ctx.escuelaId,
      rol,
      email: correo || null,
      token_hash: huella,
      creada_por: user.id,
    })
    .select('id')

  if (error || !data?.length) {
    return { ...estadoInicial, error: mensajeDeError(error?.code) }
  }

  const enlace = `${await origen()}/invitacion/${codigo}`

  revalidatePath(`/${ctx.slug}/miembros`)
  return {
    ok: true,
    enlace,
    texto: textoInvitacion({
      escuela: ctx.escuelaNombre,
      rol: NOMBRE_ROL[rol],
      enlace,
      correo: correo || null,
    }),
  }
}

export async function revocarInvitacion(
  ctx: ContextoAdmin,
  invitacionId: string,
  _previo: EstadoFormulario,
  _formData: FormData,
): Promise<EstadoFormulario> {
  const supabase = await crearClienteServidor()
  const { data, error } = await supabase
    .from('invitaciones')
    .update({ revocada_en: new Date().toISOString() })
    .eq('id', invitacionId)
    .is('aceptada_en', null)
    .is('revocada_en', null)
    .select('id')

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
  if (!data?.length) {
    return { ...estadoInicial, error: 'Esa invitacion ya se uso o ya estaba revocada.' }
  }

  revalidatePath(`/${ctx.slug}/miembros`)
  return { ok: true }
}

/**
 * Quitar una membresia. Se desactiva, no se borra: la historia de quien estuvo
 * en la escuela se conserva, y la auditoria registra el cambio.
 *
 * Nadie puede quitarse a si mismo desde aqui. Asi siempre queda al menos una
 * persona de administracion: la que esta quitando.
 */
export async function quitarMiembro(
  ctx: ContextoAdmin,
  membresiaId: string,
  _previo: EstadoFormulario,
  _formData: FormData,
): Promise<EstadoFormulario> {
  const supabase = await crearClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ...estadoInicial, error: 'Necesitas iniciar sesion.' }

  const { data, error } = await supabase
    .from('membresias')
    .update({ activa: false })
    .eq('id', membresiaId)
    .neq('perfil_id', user.id)
    .select('id')

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }
  if (!data?.length) {
    return { ...estadoInicial, error: 'No se puede quitar esa membresia.' }
  }

  revalidatePath(`/${ctx.slug}/miembros`)
  return { ok: true }
}

/**
 * Aceptar una invitacion. Va por la funcion aceptar_invitacion (security
 * definer): quien acepta todavia no es miembro y no podria crearse la
 * membresia por RLS. Ver 0006_invitaciones.sql.
 */
export async function aceptarInvitacion(
  codigo: string,
  _previo: EstadoFormulario,
  _formData: FormData,
): Promise<EstadoFormulario> {
  if (!FORMATO_CODIGO.test(codigo)) {
    return { ...estadoInicial, error: 'Este enlace no es valido.' }
  }

  const supabase = await crearClienteServidor()
  const { data: slug, error } = await supabase.rpc('aceptar_invitacion', {
    p_token: codigo,
  })

  if (error) {
    if (error.code === 'P0002') {
      return {
        ...estadoInicial,
        error: 'Esta invitacion ya no sirve: se uso, caduco o la revocaron. Pide un enlace nuevo.',
      }
    }
    if (error.code === '42501') {
      return {
        ...estadoInicial,
        error: 'Esta invitacion es para otra direccion de correo.',
      }
    }
    return { ...estadoInicial, error: mensajeDeError(error.code) }
  }

  revalidatePath('/', 'layout')
  redirect(`/${slug}`)
}
