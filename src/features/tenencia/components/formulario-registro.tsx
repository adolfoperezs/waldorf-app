'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Boton } from '@/shared/ui/boton'
import { Campo } from '@/shared/ui/campo'
import { registrarse, type EstadoRegistro } from '../actions/auth'
import { estadoInicial } from '@/shared/lib/formulario'

function BotonEnviar() {
  const { pending } = useFormStatus()
  return (
    <Boton type="submit" className="w-full" disabled={pending}>
      {pending ? 'Un momento...' : 'Crear cuenta'}
    </Boton>
  )
}

export function FormularioRegistro({ volver }: { volver?: string }) {
  const [estado, accion] = useActionState(registrarse, estadoInicial as EstadoRegistro)

  if (estado.porConfirmar) {
    return (
      <div role="status" className="space-y-2 rounded-organico border border-borde bg-superficie p-5">
        <p className="font-titulo text-lg text-primario-oscuro">Revisa tu correo</p>
        <p className="text-sm text-texto-suave">
          Te enviamos un enlace para confirmar tu cuenta. Al abrirlo entras
          directamente{volver ? ' y vuelves a donde ibas' : ''}. Si no aparece,
          mira en spam.
        </p>
      </div>
    )
  }

  return (
    <form action={accion} className="space-y-5">
      {volver && <input type="hidden" name="volver" value={volver} />}

      <Campo
        id="nombreCompleto"
        etiqueta="Nombre y apellido"
        autoComplete="name"
        required
        errores={estado.errores?.nombreCompleto}
      />

      <Campo
        id="email"
        etiqueta="Correo"
        type="email"
        autoComplete="email"
        required
        errores={estado.errores?.email}
      />

      <Campo
        id="password"
        etiqueta="Contraseña"
        type="password"
        autoComplete="new-password"
        ayuda="Al menos 10 caracteres. Mejor una frase que recuerdes."
        required
        errores={estado.errores?.password}
      />

      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}

      <BotonEnviar />
    </form>
  )
}
