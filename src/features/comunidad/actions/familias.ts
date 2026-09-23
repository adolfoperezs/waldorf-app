'use server'

import { revalidatePath } from 'next/cache'
import { generarCodigo } from '@/features/tenencia/lib/invitacion'
import { origen } from '@/features/tenencia/lib/origen'
import { textoInvitacionFamilia } from '@/features/tenencia/lib/texto-invitacion'
import { mensajeDeError } from '@/shared/lib/errores-postgres'
import { erroresPorRuta, estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { invitarIntegranteSchema, sumarFamiliaSchema } from '../schemas/comunidad'

type ContextoAdmin = { escuelaId: string; slug: string; escuelaNombre: string }

export type EstadoFamilia = EstadoFormulario & {
  /** El enlace se devuelve UNA vez: la base solo guarda su huella. */
  texto?: string
}

/** Los campos `ninos.0.nombre`, `ninos.1.nombre`... del formulario, en orden. */
function ninosDelFormulario(formData: FormData) {
  const porIndice = new Map<number, Record<string, string>>()
  for (const [clave, valor] of formData.entries()) {
    const partes = /^ninos\.(\d+)\.(\w+)$/.exec(clave)
    if (!partes || typeof valor !== 'string') continue
    const indice = Number(partes[1])
    const nino = porIndice.get(indice) ?? {}
    nino[partes[2]] = valor
    porIndice.set(indice, nino)
  }
  return [...porIndice.entries()].sort(([a], [b]) => a - b).map(([, nino]) => nino)
}

/**
 * "+ Sumar familia" (lineamiento, 3.3): la familia, sus ninos y un enlace de
 * invitacion en un solo paso.
 *
 * Va por la funcion sumar_familia, que es SECURITY INVOKER: no se salta nada,
 * cada insercion pasa por la RLS de administracion. Existe para que las tres
 * escrituras sean una transaccion. El codigo se genera aqui y a la base solo
 * viaja su huella.
 */
export async function sumarFamilia(
  ctx: ContextoAdmin,
  _previo: EstadoFamilia,
  formData: FormData,
): Promise<EstadoFamilia> {
  const analisis = sumarFamiliaSchema.safeParse({
    nombre: formData.get('nombre'),
    correo: formData.get('correo') ?? '',
    ninos: ninosDelFormulario(formData),
  })

  if (!analisis.success) {
    return {
      ...estadoInicial,
      errores: erroresPorRuta(analisis.error),
      error: 'Revisa los campos marcados.',
    }
  }

  const { nombre, correo, ninos } = analisis.data
  const { codigo, huella } = generarCodigo()
  const supabase = await crearClienteServidor()

  const { error } = await supabase.rpc('sumar_familia', {
    p_escuela: ctx.escuelaId,
    p_nombre: nombre,
    p_ninos: ninos.map((nino) => ({
      nombre: nino.nombre,
      apellidos: nino.apellidos,
      fecha_nacimiento: nino.fechaNacimiento,
      grupo_id: nino.grupoId || null,
    })),
    p_token_hash: huella,
    p_email: correo || undefined,
  })

  if (error) return { ...estadoInicial, error: mensajeDeError(error.code) }

  const enlace = `${await origen()}/invitacion/${codigo}`

  revalidatePath(`/${ctx.slug}`, 'layout')
  return {
    ok: true,
    texto: textoInvitacionFamilia({
      escuela: ctx.escuelaNombre,
      ninos: ninos.map((nino) => nino.nombre),
      enlace,
      correo: correo || null,
    }),
  }
}

/**
 * Otro enlace para la misma familia: el segundo apoderado, o uno nuevo si el
 * primero se perdio. Pasa por invitaciones_admin, como toda invitacion.
 */
export async function invitarIntegrante(
  ctx: ContextoAdmin,
  familiaId: string,
  nombresNinos: string[],
  _previo: EstadoFamilia,
  formData: FormData,
): Promise<EstadoFamilia> {
  const analisis = invitarIntegranteSchema.safeParse({ correo: formData.get('correo') ?? '' })
  if (!analisis.success) {
    return { ...estadoInicial, errores: erroresPorRuta(analisis.error) }
  }

  const supabase = await crearClienteServidor()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ...estadoInicial, error: 'Necesitas iniciar sesión.' }

  const { codigo, huella } = generarCodigo()
  const correo = analisis.data.correo

  const { data, error } = await supabase
    .from('invitaciones')
    .insert({
      escuela_id: ctx.escuelaId,
      rol: 'familia',
      familia_id: familiaId,
      email: correo || null,
      token_hash: huella,
      creada_por: user.id,
    })
    .select('id')

  if (error || !data?.length) return { ...estadoInicial, error: mensajeDeError(error?.code) }

  const enlace = `${await origen()}/invitacion/${codigo}`

  revalidatePath(`/${ctx.slug}/familias`)
  return {
    ok: true,
    texto: textoInvitacionFamilia({
      escuela: ctx.escuelaNombre,
      ninos: nombresNinos,
      enlace,
      correo: correo || null,
    }),
  }
}
