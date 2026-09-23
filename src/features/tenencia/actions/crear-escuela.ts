'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { crearClienteServidor } from '@/shared/supabase/cliente-servidor'
import { leerPlantilla, PLANTILLA_POR_DEFECTO } from '../lib/plantillas'
import { crearEscuelaSchema } from '../schemas/escuela'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'

/**
 * Alta de una escuela y de su primer administrador.
 *
 * Llama a `app.crear_escuela`, que hace las dos escrituras en una sola
 * transaccion con SECURITY DEFINER. Es el unico punto del sistema donde se
 * salta la RLS, y es deliberado: `escuelas` no tiene politica de INSERT
 * porque el primer administrador todavia no tiene membresia que lo avale.
 * Ver el comentario extenso en supabase/migrations/0001_tenencia.sql.
 *
 * Sin service_role: el cliente sigue siendo el del usuario autenticado, y la
 * funcion comprueba `auth.uid()` por dentro.
 */
export async function crearEscuela(
  _previo: EstadoFormulario,
  formData: FormData,
): Promise<EstadoFormulario> {
  const analisis = crearEscuelaSchema.safeParse({
    slug: formData.get('slug'),
    nombre: formData.get('nombre'),
    pais: formData.get('pais'),
    zonaHoraria: formData.get('zonaHoraria'),
    idioma: formData.get('idioma'),
    moneda: formData.get('moneda'),
    hemisferio: formData.get('hemisferio'),
  })

  if (!analisis.success) {
    return {
      ...estadoInicial,
      errores: z.flattenError(analisis.error).fieldErrors,
    }
  }

  const datos = analisis.data
  const supabase = await crearClienteServidor()

  const { data: escuelaId, error } = await supabase.rpc('crear_escuela', {
    p_slug: datos.slug,
    p_nombre: datos.nombre,
    p_pais: datos.pais,
    p_zona_horaria: datos.zonaHoraria,
    p_idioma: datos.idioma,
    p_moneda: datos.moneda,
    p_hemisferio: datos.hemisferio,
  })

  if (error) {
    // 23505 = unique_violation. El unico unique que puede chocar aqui es el
    // slug, y decirlo en el campo correcto ahorra un viaje.
    if (error.code === '23505') {
      return {
        ...estadoInicial,
        errores: { slug: ['Ese identificador ya está tomado'] },
      }
    }
    return {
      ...estadoInicial,
      error: 'No pudimos crear la escuela. Inténtalo de nuevo.',
    }
  }

  await clonarPlantilla(supabase, escuelaId as string)

  redirect(`/${datos.slug}`)
}

/**
 * Clona la plantilla base en la escuela recien creada.
 *
 * Las comisiones y los ciclos (0007). Epocas, festividades, tramos de aporte
 * y minuta cuelgan de un ano escolar y se materializan al crearlo; los grupos
 * los carga cada escuela desde Grupos, porque sus nombres y cohortes son suyos.
 *
 * Es el mejor esfuerzo, no un paso critico. Si falla, la escuela ya existe y
 * su administracion puede crear las comisiones a mano; abortar aqui dejaria a
 * la persona sin poder reintentar, porque el slug ya estaria tomado.
 */
async function clonarPlantilla(
  supabase: Awaited<ReturnType<typeof crearClienteServidor>>,
  escuelaId: string,
) {
  try {
    const plantilla = await leerPlantilla(PLANTILLA_POR_DEFECTO)

    if (plantilla.comisiones.length > 0) {
      await supabase.from('comisiones').insert(
        plantilla.comisiones.map((comision) => ({
          escuela_id: escuelaId,
          nombre: comision.nombre,
          descripcion: comision.descripcion ?? null,
          ve_economia: comision.ve_economia,
        })),
      )
    }

    if (plantilla.ciclos.length > 0) {
      await supabase
        .from('ciclos')
        .insert(plantilla.ciclos.map((ciclo) => ({ escuela_id: escuelaId, ...ciclo })))
    }
  } catch {
    // Sin datos de la escuela en el log (docs/PRIVACY.md).
    console.warn('No se pudo clonar la plantilla base en el alta de escuela')
  }
}
