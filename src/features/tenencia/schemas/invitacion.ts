import { z } from 'zod'
import { ROLES_INVITABLES } from '../lib/roles'

export const invitacionSchema = z.object({
  rol: z.enum(ROLES_INVITABLES, { error: 'Elige un rol' }),
  /**
   * Opcional. Si va, solo quien entre con ese correo puede aceptar. Se guarda
   * en minusculas porque asi lo exige el CHECK de la tabla y asi se compara.
   */
  correo: z
    .string()
    .trim()
    .toLowerCase()
    .refine((v) => v === '' || z.email().safeParse(v).success, 'Revisa el correo'),
})
