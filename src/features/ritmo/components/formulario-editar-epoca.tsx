'use client'

import { useActionState } from 'react'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { BotonEnvio } from '@/shared/ui/boton-envio'
import { Campo } from '@/shared/ui/campo'
import { Seleccion } from '@/shared/ui/seleccion'
import type { Epoca } from '../queries/ritmo'

type Accion = (
  previo: EstadoFormulario,
  formData: FormData,
) => Promise<EstadoFormulario>

type Grupo = { id: string; nombre: string }

/**
 * Editar una epoca. Mover fechas es lo que mas se hace al planificar el anio,
 * y cambiar el orden es como se reordenan.
 */
export function FormularioEditarEpoca({
  accion,
  epoca,
  grupos,
}: {
  accion: Accion
  epoca: Epoca
  grupos: Grupo[]
}) {
  const [estado, enviar] = useActionState(accion, estadoInicial)

  return (
    <form action={enviar} className="space-y-5">
      <input type="hidden" name="anioId" value={epoca.anio_id} />

      <Campo
        id="nombre"
        etiqueta="Nombre de la época"
        defaultValue={epoca.nombre}
        required
        errores={estado.errores?.nombre}
      />

      <Campo
        id="tema"
        etiqueta="Tema"
        defaultValue={epoca.tema ?? ''}
        errores={estado.errores?.tema}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          id="inicio"
          etiqueta="Empieza"
          type="date"
          defaultValue={epoca.inicio}
          required
          errores={estado.errores?.inicio}
        />
        <Campo
          id="fin"
          etiqueta="Termina"
          type="date"
          defaultValue={epoca.fin}
          required
          errores={estado.errores?.fin}
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          id="orden"
          etiqueta="Orden"
          type="number"
          min={1}
          max={99}
          defaultValue={epoca.orden}
          required
          errores={estado.errores?.orden}
        />

        <Seleccion
          id="grupoId"
          etiqueta="Para quién"
          defaultValue={epoca.grupo_id ?? ''}
          errores={estado.errores?.grupoId}
        >
          <option value="">Toda la escuela</option>
          {grupos.map((grupo) => (
            <option key={grupo.id} value={grupo.id}>
              {grupo.nombre}
            </option>
          ))}
        </Seleccion>
      </div>

      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}

      {estado.ok && (
        <p role="status" className="text-sm text-exito">
          Época guardada.
        </p>
      )}

      <BotonEnvio esperando="Guardando...">Guardar la época</BotonEnvio>
    </form>
  )
}
