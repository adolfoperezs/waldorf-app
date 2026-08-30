'use client'

import { useActionState } from 'react'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { BotonEnvio } from '@/shared/ui/boton-envio'
import { NOMBRE_DIA } from '../lib/fechas'
import type { Minuta } from '../queries/ritmo'

type Accion = (
  previo: EstadoFormulario,
  formData: FormData,
) => Promise<EstadoFormulario>

const DIAS = [1, 2, 3, 4, 5, 6, 7] as const

/**
 * La semana entera en un formulario.
 *
 * Muchas escuelas Waldorf asocian cada dia a un cereal. Dejar un dia en blanco
 * lo quita de la minuta: es lo que espera quien piensa "los viernes no damos
 * almuerzo".
 */
export function FormularioMinuta({
  accion,
  minuta,
}: {
  accion: Accion
  minuta: Minuta[]
}) {
  const [estado, enviar] = useActionState(accion, estadoInicial)
  const porDia = new Map(minuta.map((fila) => [fila.dia_semana, fila]))

  return (
    <form action={enviar} className="space-y-5">
      <div className="space-y-4">
        {DIAS.map((dia) => {
          const fila = porDia.get(dia)
          return (
            <div key={dia} className="grid gap-2 sm:grid-cols-[7rem_1fr]">
              <label
                htmlFor={`plato-${dia}`}
                className="pt-2.5 text-sm text-texto-suave"
              >
                {NOMBRE_DIA[dia - 1]}
              </label>

              <div className="space-y-2">
                <input
                  id={`plato-${dia}`}
                  name={`plato-${dia}`}
                  defaultValue={fila?.plato ?? ''}
                  placeholder="Sin almuerzo"
                  className="min-h-11 w-full rounded-suave border border-borde bg-superficie px-3 text-base"
                />
                <input
                  id={`notas-${dia}`}
                  name={`notas-${dia}`}
                  defaultValue={fila?.notas ?? ''}
                  placeholder="Nota (opcional)"
                  className="min-h-11 w-full rounded-suave border border-borde bg-superficie px-3 text-sm"
                />
              </div>
            </div>
          )
        })}
      </div>

      <p className="text-sm text-texto-suave">
        Un dia en blanco se quita de la minuta.
      </p>

      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}

      {estado.ok && (
        <p role="status" className="text-sm text-exito">
          Minuta guardada.
        </p>
      )}

      <BotonEnvio esperando="Guardando...">Guardar la minuta</BotonEnvio>
    </form>
  )
}
