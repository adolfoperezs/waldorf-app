'use client'

import { useActionState } from 'react'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { BotonEnvio } from '@/shared/ui/boton-envio'
import { Campo } from '@/shared/ui/campo'
import { useCerrarAlCompletar } from '@/shared/ui/panel-lateral'
import { Seleccion } from '@/shared/ui/seleccion'

type Accion = (previo: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>

export function FormularioComision({ accion }: { accion: Accion }) {
  const [estado, enviar] = useActionState(accion, estadoInicial)
  useCerrarAlCompletar(estado)

  return (
    <form action={enviar} className="space-y-5">
      <Campo id="nombre" etiqueta="Nombre" placeholder="Biblioteca" required errores={estado.errores?.nombre} />
      <Campo
        id="descripcion"
        etiqueta="De qué se ocupa (opcional)"
        maxLength={300}
        errores={estado.errores?.descripcion}
      />
      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}
      <BotonEnvio esperando="Creando...">Crear la comisión</BotonEnvio>
    </form>
  )
}

export function FormularioIntegrante({
  accion,
  personas,
}: {
  accion: Accion
  personas: { id: string; nombre: string }[]
}) {
  const [estado, enviar] = useActionState(accion, estadoInicial)
  useCerrarAlCompletar(estado)

  if (personas.length === 0) {
    return <p className="text-texto-suave">Todas las personas de la escuela ya la integran.</p>
  }

  return (
    <form action={enviar} className="space-y-5">
      <Seleccion id="perfilId" etiqueta="Persona" defaultValue={personas[0].id} errores={estado.errores?.perfilId}>
        {personas.map((p) => (
          <option key={p.id} value={p.id}>
            {p.nombre}
          </option>
        ))}
      </Seleccion>
      <label className="flex min-h-11 items-center gap-3 text-sm">
        <input type="checkbox" name="coordina" className="size-5" />
        Coordina la comisión
      </label>
      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}
      <BotonEnvio esperando="Sumando...">Sumar a la comisión</BotonEnvio>
    </form>
  )
}
