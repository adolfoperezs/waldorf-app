'use client'

import { useActionState } from 'react'
import { estadoInicial } from '@/shared/lib/formulario'
import { BotonEnvio } from '@/shared/ui/boton-envio'
import { Campo } from '@/shared/ui/campo'
import { pedirRecuperacion, type EstadoRecuperar } from '../actions/auth'

export function FormularioRecuperar() {
  const [estado, accion] = useActionState(pedirRecuperacion, estadoInicial as EstadoRecuperar)

  if (estado.enviado) {
    // La misma respuesta exista o no la cuenta: no revela quien es parte de
    // la comunidad escolar.
    return (
      <div role="status" className="space-y-2 rounded-organico border border-borde bg-superficie p-5">
        <p className="font-titulo text-lg text-primario-oscuro">Revisa tu correo</p>
        <p className="text-sm text-texto-suave">
          Si hay una cuenta con ese correo, te llegó un enlace para elegir una
          contraseña nueva. Sirve durante una hora. Si no aparece, mira en spam.
        </p>
      </div>
    )
  }

  return (
    <form action={accion} className="space-y-5">
      <Campo
        id="email"
        etiqueta="Correo"
        type="email"
        autoComplete="email"
        required
        errores={estado.errores?.email}
      />

      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}

      <BotonEnvio className="w-full" esperando="Enviando...">
        Enviarme el enlace
      </BotonEnvio>
    </form>
  )
}
