'use client'

import { useActionState } from 'react'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { BotonEnvio } from '@/shared/ui/boton-envio'
import { Campo } from '@/shared/ui/campo'
import { Seleccion } from '@/shared/ui/seleccion'

type Accion = (
  previo: EstadoFormulario,
  formData: FormData,
) => Promise<EstadoFormulario>

type Grupo = { id: string; nombre: string }

export function FormularioEpoca({
  accion,
  anioId,
  grupos,
  ordenSugerido,
}: {
  accion: Accion
  anioId: string
  grupos: Grupo[]
  ordenSugerido: number
}) {
  const [estado, enviar] = useActionState(accion, estadoInicial)

  return (
    <form action={enviar} className="space-y-5">
      <input type="hidden" name="anioId" value={anioId} />

      <Campo
        id="nombre"
        etiqueta="Nombre de la epoca"
        placeholder="Numeros y ritmo"
        required
        errores={estado.errores?.nombre}
      />

      <Campo
        id="tema"
        etiqueta="Tema"
        ayuda="Opcional. Una linea sobre de que trata."
        errores={estado.errores?.tema}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          id="inicio"
          etiqueta="Empieza"
          type="date"
          required
          errores={estado.errores?.inicio}
        />
        <Campo
          id="fin"
          etiqueta="Termina"
          type="date"
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
          defaultValue={ordenSugerido}
          required
          errores={estado.errores?.orden}
        />

        <Seleccion
          id="grupoId"
          etiqueta="Para quien"
          ayuda="Toda la escuela, o solo un grupo."
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

      <BotonEnvio esperando="Creando...">Crear epoca</BotonEnvio>
    </form>
  )
}
