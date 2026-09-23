'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Boton } from '@/shared/ui/boton'
import { Campo } from '@/shared/ui/campo'
import { iniciarSesion } from '../actions/auth'
import { estadoInicial } from '@/shared/lib/formulario'

function BotonEnviar({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus()
  return (
    <Boton type="submit" className="w-full" disabled={pending}>
      {pending ? 'Un momento...' : children}
    </Boton>
  )
}

export function FormularioLogin({ volver }: { volver?: string }) {
  const [estado, accion] = useActionState(iniciarSesion, estadoInicial)

  return (
    <form action={accion} className="space-y-5">
      {volver && <input type="hidden" name="volver" value={volver} />}

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
        autoComplete="current-password"
        required
        errores={estado.errores?.password}
      />

      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}

      <BotonEnviar>Entrar</BotonEnviar>
    </form>
  )
}
