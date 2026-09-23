import { FormularioNuevaContrasena } from '@/features/tenencia/components/formulario-nueva-contrasena'

/**
 * Se llega aqui desde el enlace del correo de recuperacion, ya con sesion
 * (/auth/confirmar la abre). Sin sesion, proxy.ts manda al login.
 */
export default function PaginaNuevaContrasena() {
  return (
    <div className="space-y-6">
      <h1 className="font-titulo text-2xl">Elige tu contraseña nueva</h1>
      <FormularioNuevaContrasena />
    </div>
  )
}
