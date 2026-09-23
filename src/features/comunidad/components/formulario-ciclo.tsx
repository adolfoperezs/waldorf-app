'use client'

import { useActionState, useState } from 'react'
import { ACENTOS, CLASES_ACENTO, NOMBRE_ACENTO } from '@/shared/design/acentos'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { cn } from '@/shared/lib/utils'
import { BotonEnvio } from '@/shared/ui/boton-envio'
import { Campo } from '@/shared/ui/campo'
import { useCerrarAlCompletar } from '@/shared/ui/panel-lateral'
import { Seleccion } from '@/shared/ui/seleccion'
import { DESCRIPCION_MODALIDAD, MODALIDADES, NOMBRE_MODALIDAD } from '../schemas/comunidad'

type Accion = (previo: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>

// Escritas enteras para que Tailwind las encuentre (ver shared/design/acentos.ts).
const BORDE_MARCADO: Record<(typeof ACENTOS)[number], string> = {
  salvia: 'has-[:checked]:border-salvia-500',
  ocre: 'has-[:checked]:border-ocre-500',
  arcilla: 'has-[:checked]:border-arcilla-500',
  tierra: 'has-[:checked]:border-tierra-500',
}

export function FormularioCiclo({ accion }: { accion: Accion }) {
  const [estado, enviar] = useActionState(accion, estadoInicial)
  const [modalidad, setModalidad] = useState<(typeof MODALIDADES)[number]>('escolar')
  useCerrarAlCompletar(estado)

  return (
    <form action={enviar} className="space-y-5">
      <Campo
        id="nombre"
        etiqueta="Nombre del ciclo"
        placeholder="Grupo Semilla"
        required
        errores={estado.errores?.nombre}
      />

      <Seleccion
        id="modalidad"
        etiqueta="Cómo se vive el ritmo"
        value={modalidad}
        onChange={(e) => setModalidad(e.target.value as typeof modalidad)}
        ayuda={DESCRIPCION_MODALIDAD[modalidad]}
        errores={estado.errores?.modalidad}
      >
        {MODALIDADES.map((m) => (
          <option key={m} value={m}>
            {NOMBRE_MODALIDAD[m]}
          </option>
        ))}
      </Seleccion>

      <fieldset className="space-y-2">
        <legend className="text-sm text-texto-suave">Color</legend>
        <div className="flex flex-wrap gap-2">
          {ACENTOS.map((acento, i) => (
            <label
              key={acento}
              className={cn(
                'flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 px-3 text-sm',
                'border-borde has-[:checked]:bg-superficie has-[:checked]:shadow-reposo',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-primario',
                BORDE_MARCADO[acento],
              )}
            >
              <input
                type="radio"
                name="acento"
                value={acento}
                defaultChecked={i === 0}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn('size-3 rounded-full', CLASES_ACENTO[acento].relleno)}
              />
              {NOMBRE_ACENTO[acento]}
            </label>
          ))}
        </div>
      </fieldset>

      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}

      <BotonEnvio esperando="Creando...">Crear el ciclo</BotonEnvio>
    </form>
  )
}
