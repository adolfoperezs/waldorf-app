/**
 * Destino tras entrar, registrarse o confirmar un correo. Solo rutas internas:
 * nunca un host externo. Un `volver=//otro-sitio.com` o `volver=https://...`
 * convertiria el login de la escuela en un trampolin para phishing.
 */
export function destinoSeguro(valor: unknown): string {
  const ruta = typeof valor === 'string' ? valor : ''
  // `/\otro-sitio.com` los navegadores lo leen como `//otro-sitio.com`.
  return ruta.startsWith('/') && !ruta.startsWith('//') && !ruta.startsWith('/\\')
    ? ruta
    : '/'
}
