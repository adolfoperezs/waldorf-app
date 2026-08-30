'use client'

import { useActionState } from 'react'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { Boton } from './boton'
import { BotonEnvio } from './boton-envio'

type Accion = (
  previo: EstadoFormulario,
  formData: FormData,
) => Promise<EstadoFormulario>

/**
 * Un boton que dispara una server action sin campos de formulario.
 *
 * Va dentro de un `<form>` de verdad, no de un onClick: asi funciona tambien
 * sin JavaScript, que importa cuando la conexion es mala.
 */
export function BotonAccion({
  accion,
  children,
  variante = 'suave',
  className,
}: {
  accion: Accion
  children: React.ReactNode
  variante?: React.ComponentProps<typeof Boton>['variante']
  className?: string
}) {
  const [estado, enviar] = useActionState(accion, estadoInicial)

  return (
    <form action={enviar} className={className}>
      <BotonEnvio variante={variante}>{children}</BotonEnvio>
      {estado.error && (
        <p role="alert" className="mt-2 text-sm text-alerta">
          {estado.error}
        </p>
      )}
    </form>
  )
}
