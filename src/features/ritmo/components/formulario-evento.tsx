'use client'

import { useActionState } from 'react'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { BotonEnvio } from '@/shared/ui/boton-envio'
import { Campo } from '@/shared/ui/campo'
import { Seleccion } from '@/shared/ui/seleccion'
import { NOMBRE_TIPO_EVENTO, TIPOS_EVENTO } from '../schemas/ritmo'

type Accion = (
  previo: EstadoFormulario,
  formData: FormData,
) => Promise<EstadoFormulario>

export function FormularioEvento({
  accion,
  zonaHoraria,
}: {
  accion: Accion
  zonaHoraria: string
}) {
  const [estado, enviar] = useActionState(accion, estadoInicial)

  return (
    <form action={enviar} className="space-y-5">
      <Campo
        id="titulo"
        etiqueta="Titulo"
        placeholder="Jornada de huerto"
        required
        errores={estado.errores?.titulo}
      />

      <Seleccion id="tipo" etiqueta="Tipo" defaultValue="jornada" errores={estado.errores?.tipo}>
        {TIPOS_EVENTO.map((tipo) => (
          <option key={tipo} value={tipo}>
            {NOMBRE_TIPO_EVENTO[tipo]}
          </option>
        ))}
      </Seleccion>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          id="fecha"
          etiqueta="Fecha"
          type="date"
          required
          errores={estado.errores?.fecha}
        />
        <Campo
          id="hora"
          etiqueta="Hora"
          type="time"
          defaultValue="09:00"
          ayuda={`Hora de la escuela (${zonaHoraria}).`}
          errores={estado.errores?.hora}
        />
      </div>

      <Campo id="lugar" etiqueta="Donde" errores={estado.errores?.lugar} />
      <Campo id="descripcion" etiqueta="Descripcion" errores={estado.errores?.descripcion} />

      <div className="space-y-3">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="requiereInscripcion" className="size-5" />
          Hay que inscribirse
        </label>

        <Campo
          id="cupo"
          etiqueta="Cupo"
          type="number"
          min={1}
          ayuda="Opcional."
          errores={estado.errores?.cupo}
        />

        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" name="publico" defaultChecked className="size-5" />
          Visible para toda la comunidad
        </label>
        <p className="text-sm text-texto-suave">
          Si lo desmarcas, solo lo ve el equipo. Lo aplica la base de datos, no
          la interfaz.
        </p>
      </div>

      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}

      <BotonEnvio esperando="Creando...">Crear evento</BotonEnvio>
    </form>
  )
}
