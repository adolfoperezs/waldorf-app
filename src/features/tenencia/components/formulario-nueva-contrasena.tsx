'use client'

import { useActionState } from 'react'
import { estadoInicial } from '@/shared/lib/formulario'
import { BotonEnvio } from '@/shared/ui/boton-envio'
import { Campo } from '@/shared/ui/campo'
import { cambiarContrasena } from '../actions/auth'

export function FormularioNuevaContrasena() {
  const [estado, accion] = useActionState(cambiarContrasena, estadoInicial)

  return (
    <form action={accion} className="space-y-5">
      <Campo
        id="password"
        etiqueta="Contraseña nueva"
        type="password"
        autoComplete="new-password"
        ayuda="Al menos 10 caracteres. Mejor una frase que recuerdes."
        required
        errores={estado.errores?.password}
      />

      <Campo
        id="confirmacion"
        etiqueta="Repítela"
        type="password"
        autoComplete="new-password"
        required
        errores={estado.errores?.confirmacion}
      />

      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}

      <BotonEnvio className="w-full" esperando="Guardando...">
        Guardar y entrar
      </BotonEnvio>
    </form>
  )
}
