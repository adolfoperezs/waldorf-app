'use client'

import { useActionState } from 'react'
import { estadoInicial } from '@/shared/lib/formulario'
import { BotonEnvio } from '@/shared/ui/boton-envio'
import { Campo } from '@/shared/ui/campo'
import { CopiarParaWhatsapp } from '@/shared/ui/copiar-para-whatsapp'
import type { EstadoFamilia } from '../actions/familias'

type Accion = (previo: EstadoFamilia, formData: FormData) => Promise<EstadoFamilia>

/** Un enlace mas para la misma familia. No cierra el panel: muestra el enlace. */
export function FormularioInvitarIntegrante({ accion }: { accion: Accion }) {
  const [estado, enviar] = useActionState(accion, estadoInicial as EstadoFamilia)

  if (estado.ok && estado.texto) {
    return (
      <div role="status" className="space-y-4">
        <p className="font-titulo text-lg text-primario-oscuro">Enlace listo.</p>
        <p className="text-sm text-texto-suave">
          Mándalo ahora: por seguridad no se vuelve a mostrar.
        </p>
        <CopiarParaWhatsapp texto={estado.texto} />
      </div>
    )
  }

  return (
    <form action={enviar} className="space-y-5">
      <p className="text-texto-suave">
        Cada persona entra con su propio enlace. Quien lo acepte verá a los mismos
        niños que el resto de la familia.
      </p>

      <Campo
        id="correo"
        etiqueta="Correo (opcional)"
        type="email"
        autoComplete="off"
        ayuda="Si lo pones, solo esa persona podrá usar el enlace."
        errores={estado.errores?.correo}
      />

      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}

      <BotonEnvio esperando="Creando...">Crear enlace</BotonEnvio>
    </form>
  )
}
