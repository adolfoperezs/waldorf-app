'use client'

import { useActionState } from 'react'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { BotonEnvio } from '@/shared/ui/boton-envio'
import { Campo } from '@/shared/ui/campo'
import { useCerrarAlCompletar } from '@/shared/ui/panel-lateral'
import { Seleccion } from '@/shared/ui/seleccion'

type Accion = (previo: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>

type Ciclo = { id: string; nombre: string }

/** Crear o editar un grupo. Con `grupo`, edita. */
export function FormularioGrupo({
  accion,
  ciclos,
  grupo,
  anioSugerido,
}: {
  accion: Accion
  ciclos: Ciclo[]
  grupo?: { nombre: string; ciclo_id: string | null; anio_cohorte: number }
  anioSugerido: number
}) {
  const [estado, enviar] = useActionState(accion, estadoInicial)
  useCerrarAlCompletar(estado)

  return (
    <form action={enviar} className="space-y-5">
      <Campo
        id="nombre"
        etiqueta="Nombre del grupo"
        placeholder="3° básico"
        defaultValue={grupo?.nombre}
        ayuda="Como lo llama la comunidad. El grupo persiste entre años: se puede renombrar cuando pasa de curso."
        required
        errores={estado.errores?.nombre}
      />

      <Seleccion
        id="cicloId"
        etiqueta="Ciclo"
        defaultValue={grupo?.ciclo_id ?? ciclos[0]?.id ?? ''}
        ayuda="Decide qué ven las familias: el ritmo de jardín o el de la clase principal."
        errores={estado.errores?.cicloId}
      >
        <option value="">Sin ciclo</option>
        {ciclos.map((ciclo) => (
          <option key={ciclo.id} value={ciclo.id}>
            {ciclo.nombre}
          </option>
        ))}
      </Seleccion>

      <Campo
        id="anioCohorte"
        etiqueta="Año en que empezó"
        type="number"
        inputMode="numeric"
        min={1990}
        max={2100}
        defaultValue={grupo?.anio_cohorte ?? anioSugerido}
        ayuda="El año en que esta cohorte entró a su primer año. Ordena los grupos de menor a mayor."
        required
        errores={estado.errores?.anioCohorte}
      />

      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}

      <BotonEnvio esperando="Guardando...">
        {grupo ? 'Guardar el grupo' : 'Crear el grupo'}
      </BotonEnvio>
    </form>
  )
}
