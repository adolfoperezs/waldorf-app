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
    'El enlace sirve una sola vez y caduca en 7 días.',
  ]
    .filter(Boolean)
    .join('\n\n')
}

/**
 * El mensaje de bienvenida para una familia recien sumada (lineamiento, 3.3).
 * Nombra a los ninos: la familia entra para acompanar el ritmo de ELLOS.
 */
export function textoInvitacionFamilia({
  escuela,
  ninos,
  enlace,
  correo,
}: {
  escuela: string
  ninos: string[]
  enlace: string
  correo: string | null
}): string {
  const nombres = new Intl.ListFormat('es', { type: 'conjunction' }).format(ninos)
  return [
    `¡Hola, familia! Les damos la bienvenida a *${escuela}*.`,
    `Creen su acceso para acompañar el ritmo de ${nombres} aquí:\n${enlace}`,
    correo ? `Entren con el correo ${correo}.` : null,
    'El enlace sirve para una sola persona y caduca en 7 días. Si otro integrante de la familia quiere entrar, pidan un enlace más.',
  ]
    .filter(Boolean)
    .join('\n\n')
}
