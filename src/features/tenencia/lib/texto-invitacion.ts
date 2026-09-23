/**
 * El mensaje para mandar la invitacion por WhatsApp.
 *
 * Funcion pura, sin acceso a red ni a la base. No se envia nada desde aqui:
 * la administracion lo copia y lo pega (docs/ARCHITECTURE.md).
 */
export function textoInvitacion({
  escuela,
  rol,
  enlace,
  correo,
}: {
  escuela: string
  rol: string
  enlace: string
  correo: string | null
}): string {
  return [
    `*${escuela}* te invita a unirte como *${rol}*.`,
    `Abre este enlace para crear tu cuenta y aceptar:\n${enlace}`,
    correo ? `Entra con tu correo ${correo}.` : null,
    'El enlace sirve una sola vez y caduca en 7 dias.',
  ]
    .filter(Boolean)
    .join('\n\n')
}
