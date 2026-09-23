'use client'

import { useActionState, useState } from 'react'
import { BotonEnvio } from '@/shared/ui/boton-envio'
import { Campo } from '@/shared/ui/campo'
import { CopiarParaWhatsapp } from '@/shared/ui/copiar-para-whatsapp'
import { Seleccion } from '@/shared/ui/seleccion'
import type { EstadoInvitacion } from '../actions/invitaciones'
import { DESCRIPCION_ROL, NOMBRE_ROL, ROLES_INVITABLES } from '../lib/roles'

type Accion = (previo: EstadoInvitacion, formData: FormData) => Promise<EstadoInvitacion>

export function FormularioInvitacion({ accion }: { accion: Accion }) {
  const [estado, enviar] = useActionState(accion, { ok: false } as EstadoInvitacion)
  const [rol, setRol] = useState<(typeof ROLES_INVITABLES)[number]>('familia')

  return (
    <div className="space-y-6">
      <form action={enviar} className="space-y-5">
        <Seleccion
          id="rol"
          etiqueta="Como qué entra"
          value={rol}
          onChange={(e) => setRol(e.target.value as typeof rol)}
          ayuda={DESCRIPCION_ROL[rol]}
          errores={estado.errores?.rol}
        >
          {ROLES_INVITABLES.map((r) => (
            <option key={r} value={r}>
              {NOMBRE_ROL[r]}
            </option>
          ))}
        </Seleccion>

        <Campo
          id="correo"
          etiqueta="Correo (opcional)"
          type="email"
          autoComplete="off"
          ayuda="Si lo pones, solo esa persona podrá usar el enlace. Sin correo, lo usa quien lo tenga: no lo mandes a un grupo abierto."
          errores={estado.errores?.correo}
        />

        {estado.error && (
          <p role="alert" className="text-sm text-alerta">
            {estado.error}
          </p>
        )}

        <BotonEnvio esperando="Creando...">Crear enlace de invitación</BotonEnvio>
      </form>

      {estado.ok && estado.texto && (
        <div
          role="status"
          className="space-y-3 rounded-organico border border-tierra-300 bg-crema-100 p-4"
        >
          <p className="font-medium">Enlace listo.</p>
          <p className="text-sm text-texto-suave">
            Cópialo ahora: por seguridad no se vuelve a mostrar. Si se pierde, crea
            otro y revoca este.
          </p>
          <CopiarParaWhatsapp texto={estado.texto} />
        </div>
      )}
    </div>
  )
}
