'use client'

import { useActionState } from 'react'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { BotonEnvio } from '@/shared/ui/boton-envio'
import { Campo } from '@/shared/ui/campo'
import { useCerrarAlCompletar } from '@/shared/ui/panel-lateral'

type Accion = (
  previo: EstadoFormulario,
  formData: FormData,
) => Promise<EstadoFormulario>

export function FormularioAnio({ accion }: { accion: Accion }) {
  const [estado, enviar] = useActionState(accion, estadoInicial)
  useCerrarAlCompletar(estado)

  return (
    <form action={enviar} className="space-y-5">
      <Campo
        id="nombre"
        etiqueta="Nombre del año"
        placeholder="2026"
        required
        errores={estado.errores?.nombre}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          id="inicio"
          etiqueta="Primer día"
          type="date"
          required
          errores={estado.errores?.inicio}
        />
        <Campo
          id="fin"
          etiqueta="Último día"
          type="date"
          required
          errores={estado.errores?.fin}
        />
      </div>

      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}

      <BotonEnvio esperando="Creando...">Crear el año</BotonEnvio>
    </form>
  )
}
