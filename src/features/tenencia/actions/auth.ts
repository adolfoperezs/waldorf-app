'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { credencialesSchema, registroSchema } from '../schemas/auth'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'

/**
 * Fase 0 del roadmap: email y contrasena, sin OAuth.
 *
 * Los mensajes de error no distinguen entre "ese correo no existe" y
 * "la contrasena no coincide": decirlo convierte el formulario en un
 * verificador de quien pertenece a la comunidad escolar.
 */

/** Destino tras iniciar sesion. Solo rutas internas: nunca un host externo. */
function destinoSeguro(valor: FormDataEntryValue | null) {
  const ruta = typeof valor === 'string' ? valor : ''
  return ruta.startsWith('/') && !ruta.startsWith('//') ? ruta : '/'
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
    return { ...estadoInicial, error: 'El correo o la contrasena no coinciden' }
  }

  revalidatePath('/', 'layout')
  redirect(destinoSeguro(formData.get('volver')))
}

export async function registrarse(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analisis = registroSchema.safeParse({
    nombreCompleto: formData.get('nombreCompleto'),
    email: formData.get('email'),
    password: formData.get('password'),
  })

  if (!analisis.success) {
    return { ...estadoInicial, errores: z.flattenError(analisis.error).fieldErrors }
  }

  const { nombreCompleto, email, password } = analisis.data
  const supabase = await crearClienteServidor()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // El trigger app.crear_perfil_al_registrar lee esta clave para poblar
      // perfiles.nombre_completo. Ver 0001_tenencia.sql.
      data: { nombre_completo: nombreCompleto },
    },
  })

  if (error) {
    return {
      ...estadoInicial,
      error: 'No pudimos crear la cuenta. Revisa los datos e intentalo de nuevo.',
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
