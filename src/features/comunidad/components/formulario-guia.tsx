'use client'

import { useActionState } from 'react'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { BotonEnvio } from '@/shared/ui/boton-envio'
import { useCerrarAlCompletar } from '@/shared/ui/panel-lateral'
import { Seleccion } from '@/shared/ui/seleccion'

type Accion = (previo: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>

export function FormularioGuia({
  accion,
  maestros,
  actual,
}: {
  accion: Accion
  maestros: { id: string; nombre: string }[]
  actual: string | null
}) {
  const [estado, enviar] = useActionState(accion, estadoInicial)
  useCerrarAlCompletar(estado)

  if (maestros.length === 0) {
    return (
      <p className="text-texto-suave">
        Todavía no hay nadie del equipo pedagógico en la escuela. Invita a la
        maestra desde Miembros, con el rol de maestra o maestro guía, y vuelve aquí.
      </p>
    )
  }

  return (
    <form action={enviar} className="space-y-5">
      <Seleccion
        id="perfilId"
        etiqueta="Maestra o maestro guía"
        defaultValue={actual ?? maestros[0].id}
        ayuda="Acompaña al grupo durante años. Si cambia, la anterior queda en la historia del grupo, no se borra."
        errores={estado.errores?.perfilId}
      >
        {maestros.map((maestro) => (
          <option key={maestro.id} value={maestro.id}>
            {maestro.nombre}
          </option>
        ))}
      </Seleccion>

      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}

      <BotonEnvio esperando="Guardando...">Asignar</BotonEnvio>
    </form>
  )
}
