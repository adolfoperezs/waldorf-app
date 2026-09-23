'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { destinoSeguro } from '../lib/destino'
import { origen } from '../lib/origen'
import {
  credencialesSchema,
  nuevaContrasenaSchema,
  recuperarSchema,
  registroSchema,
} from '../schemas/auth'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'

/**
 * Fase 0 del roadmap: email y contrasena, sin OAuth.
 *
 * Los mensajes de error no distinguen entre "ese correo no existe" y
 * "la contrasena no coincide": decirlo convierte el formulario en un
 * verificador de quien pertenece a la comunidad escolar. Lo mismo vale para
 * recuperar la contrasena: la respuesta es igual exista o no la cuenta.
 */

export type EstadoRegistro = EstadoFormulario & {
  /** La cuenta existe pero falta confirmar el correo ("Confirm email" activo). */
  porConfirmar?: boolean
}

export type EstadoRecuperar = EstadoFormulario & { enviado?: boolean }

/**
 * Enlace de vuelta desde un correo de Supabase: pasa por /auth/confirmar,
 * que canjea el token y luego lleva a `siguiente`.
 */
async function enlaceDeConfirmacion(siguiente: string) {
  return `${await origen()}/auth/confirmar?siguiente=${encodeURIComponent(siguiente)}`
}

export async function iniciarSesion(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analisis = credencialesSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.auth.signInWithPassword(analisis.data)

  if (error) {
    if (error.code === 'email_not_confirmed') {
      return {
        ...estadoInicial,
        error: 'Falta confirmar tu correo. Busca el mensaje que te enviamos al crear la cuenta.',
      }
    }
    return { ...estadoInicial, error: 'El correo o la contraseña no coinciden' }
  }

  revalidatePath('/', 'layout')
  redirect(destinoSeguro(formData.get('volver')))
}

export async function registrarse(
  _previo: EstadoRegistro,
  formData: FormData,
): Promise<EstadoRegistro> {
  const analisis = registroSchema.safeParse({
    nombreCompleto: formData.get('nombreCompleto'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const { nombreCompleto, email, password } = analisis.data
  const volver = destinoSeguro(formData.get('volver'))
  const supabase = await crearClienteServidor()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // El trigger app.crear_perfil_al_registrar lee esta clave para poblar
      // perfiles.nombre_completo. Ver 0001_tenencia.sql.
      data: { nombre_completo: nombreCompleto },
      // Solo se usa si "Confirm email" esta activo en Supabase: el correo
      // de confirmacion trae de vuelta a donde iba (una invitacion, p. ej.).
      emailRedirectTo: await enlaceDeConfirmacion(volver),
    },
  })

  if (error) {
    return {
      ...estadoInicial,
      error: 'No pudimos crear la cuenta. Revisa los datos e inténtalo de nuevo.',
    }
  }

  // Con la confirmacion de correo activa no hay sesion todavia: la persona
  // tiene que abrir el enlace del correo.
  if (!data.session) return { ok: true, porConfirmar: true }

  revalidatePath('/', 'layout')
  // Quien llega desde una invitacion vuelve a ella tras registrarse.
  redirect(volver)
}

/**
 * Pedir un enlace para elegir una contrasena nueva.
 *
 * La respuesta es la misma exista o no la cuenta. El enlace del correo lleva
 * a /auth/confirmar y de ahi a /nueva-contrasena, ya con sesion.
 */
export async function pedirRecuperacion(
  _previo: EstadoRecuperar,
  formData: FormData,
): Promise<EstadoRecuperar> {
  const analisis = recuperarSchema.safeParse({ email: formData.get('email') })
  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.auth.resetPasswordForEmail(analisis.data.email, {
    redirectTo: await enlaceDeConfirmacion('/nueva-contrasena'),
  })

  if (error?.status === 429) {
    return {
      ...estadoInicial,
      error: 'Se pidieron demasiados correos seguidos. Espera unos minutos y vuelve a intentarlo.',
    }
  }
  if (error) {
    // Sin el correo en el log (docs/PRIVACY.md). El codigo basta para saber
    // si es, por ejemplo, el limite del servidor de correo por defecto.
    console.warn('No se pudo enviar el correo de recuperacion:', error.code ?? error.status)
  }

  return { ok: true, enviado: true }
}

/** Elegir la contrasena nueva. Exige la sesion que abrio el enlace del correo. */
export async function cambiarContrasena(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analisis = nuevaContrasenaSchema.safeParse({
    password: formData.get('password'),
    confirmacion: formData.get('confirmacion'),
  })
  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const supabase = await crearClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return {
      ...estadoInicial,
      error: 'El enlace caducó. Pide uno nuevo desde "¿Olvidaste tu contraseña?".',
    }
  }

  const { error } = await supabase.auth.updateUser({ password: analisis.data.password })

  if (error) {
    if (error.code === 'same_password') {
      return {
        ...estadoInicial,
        errores: { password: ['Tiene que ser distinta de la que tenías.'] },
      }
    }
    if (error.code === 'weak_password') {
      return {
        ...estadoInicial,
        errores: { password: ['Es demasiado fácil de adivinar. Prueba con una frase.'] },
      }
    }
    return {
      ...estadoInicial,
      error: 'No pudimos cambiar la contraseña. Inténtalo de nuevo.',
    }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
