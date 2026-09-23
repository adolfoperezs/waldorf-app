import type { Rol } from '../queries/escuela'

/**
 * Los roles de una membresia.
 *
 * Es uno de los pocos `enum` legitimos: son estructurales, no vocabulario
 * pedagogico configurable (ver waldorf-domain).
 *
 * Las descripciones dicen lo que el rol abre HOY, y lo que no: un rol dice que
 * es la persona en la escuela, pero el acceso a ninos lo dan las relaciones
 * (grupo_maestros, familia_miembros), no la etiqueta. Ver docs/MAPA.md.
 */

/** Orden del selector: lo mas frecuente primero. */
export const ROLES_INVITABLES = [
  'familia',
  'maestro_guia',
  'maestro_especialidad',
  'colegio_maestros',
  'comision',
  'administracion',
] as const satisfies readonly Rol[]

export const NOMBRE_ROL: Record<Rol, string> = {
  administracion: 'Administracion',
  colegio_maestros: 'Colegio de maestros',
  maestro_guia: 'Maestro guia',
  maestro_especialidad: 'Maestro de especialidad',
  comision: 'Comision',
  familia: 'Familia',
}

export const DESCRIPCION_ROL: Record<Rol, string> = {
  familia:
    'Ve el calendario y los encuentros. Vera a sus hijos cuando se la vincule a su familia.',
  maestro_guia:
    'Ve el calendario. Vera a los ninos de su grupo cuando se la asigne a uno.',
  maestro_especialidad:
    'Ve el calendario. Vera a los ninos de los grupos donde ensena cuando se la asigne.',
  colegio_maestros:
    'Configura el ritmo del anio: anios, epocas, festividades, encuentros y minuta.',
  comision:
    'Ve el calendario. Gestiona campanas cuando se la sume a una comision.',
  administracion:
    'Todo: configuracion, miembros, familias y aportes. Darla con cuidado.',
}
