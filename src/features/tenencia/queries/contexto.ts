import 'server-only'
import { notFound } from 'next/navigation'
import { escuelaPorSlug, misRoles, type Escuela, type Rol } from './escuela'

/**
 * Resuelve la escuela de la ruta y los roles de quien mira.
 *
 * Un 404 y no un 403 cuando no hay acceso: la RLS devuelve cero filas tanto si
 * la escuela no existe como si existe y no eres miembro, y desde fuera esas
 * dos cosas deben ser indistinguibles.
 *
 * `esGestor` es solo para decidir QUE MOSTRAR. Quien autoriza de verdad es la
 * politica de Postgres: esconder un boton no protege nada.
 */
export type ContextoDeEscuela = {
  escuela: Escuela
  roles: Rol[]
  esGestor: boolean
}

export async function cargarEscuela(slug: string): Promise<ContextoDeEscuela> {
  const escuela = await escuelaPorSlug(slug)
  if (!escuela) notFound()

  const roles = await misRoles(escuela.id)
  const esGestor = roles.some(
    (rol) => rol === 'administracion' || rol === 'colegio_maestros',
  )

  return { escuela, roles, esGestor }
}
