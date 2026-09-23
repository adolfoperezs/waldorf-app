'use client'

import { useActionState } from 'react'
import type { Modalidad } from '@/features/comunidad/queries/comunidad'
import { estadoInicial, type EstadoFormulario } from '@/shared/lib/formulario'
import { AreaTexto } from '@/shared/ui/area-texto'
import { BotonEnvio } from '@/shared/ui/boton-envio'
import { Campo } from '@/shared/ui/campo'
import { useCerrarAlCompletar } from '@/shared/ui/panel-lateral'

type Accion = (previo: EstadoFormulario, formData: FormData) => Promise<EstadoFormulario>

/**
 * Plantilla adaptativa (lineamiento, 3.2): los mismos datos, con las
 * preguntas que tienen sentido en cada ciclo. En jardin no se preguntan
 * materias.
 */
const PREGUNTAS = {
  jardin: {
    tema: {
      etiqueta: 'Cuento, ronda o arquetipo de la semana',
      ejemplo: 'El gnomo que cuidaba las semillas',
    },
    recordatorio: {
      etiqueta: 'Recordatorio para las familias',
      ejemplo: 'Botas de agua y muda de ropa: el jueves vamos al bosque.',
    },
    actividad: {
      etiqueta: 'Actividad del día',
      ejemplo: 'Panificación, acuarela, huerto, juego en el bosque...',
    },
    nota: { etiqueta: 'Nota para las familias', ejemplo: 'Traer abrigo.' },
  },
  escolar: {
    tema: {
      etiqueta: 'Tema de la semana en la clase principal',
      ejemplo: 'Las fábulas del zorro',
    },
    recordatorio: {
      etiqueta: 'Recordatorio para las familias',
      ejemplo: 'El viernes se entrega el cuaderno de época.',
    },
    actividad: {
      etiqueta: 'Clase principal',
      ejemplo: 'Historias y leyendas: la fábula del cuervo',
    },
    nota: { etiqueta: 'Materiales para el aula', ejemplo: 'Cuaderno de época y témperas.' },
  },
} as const

export function FormularioSemana({
  accion,
  modalidad,
  tema,
  recordatorio,
}: {
  accion: Accion
  modalidad: Modalidad
  tema: string | null
  recordatorio: string | null
}) {
  const [estado, enviar] = useActionState(accion, estadoInicial)
  useCerrarAlCompletar(estado)
  const p = PREGUNTAS[modalidad]

  return (
    <form action={enviar} className="space-y-5">
      <Campo
        id="tema"
        etiqueta={p.tema.etiqueta}
        placeholder={p.tema.ejemplo}
        defaultValue={tema ?? ''}
        maxLength={300}
        errores={estado.errores?.tema}
      />
      <AreaTexto
        id="recordatorio"
        etiqueta={p.recordatorio.etiqueta}
        placeholder={p.recordatorio.ejemplo}
        defaultValue={recordatorio ?? ''}
        maxLength={1000}
        errores={estado.errores?.recordatorio}
      />

      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}

      <BotonEnvio esperando="Guardando...">Guardar la semana</BotonEnvio>
    </form>
  )
}

export function FormularioDia({
  accion,
  modalidad,
  dia,
  actividad,
  materias,
  alimento,
  alimentoMinuta,
  nota,
}: {
  accion: Accion
  modalidad: Modalidad
  dia: number
  actividad: string | null
  materias: string[]
  /** Lo que escribio la maestra. Vacio = el de la minuta. */
  alimento: string | null
  alimentoMinuta: string | null
  nota: string | null
}) {
  const [estado, enviar] = useActionState(accion, estadoInicial)
  useCerrarAlCompletar(estado)
  const p = PREGUNTAS[modalidad]

  return (
    <form action={enviar} className="space-y-5">
      <input type="hidden" name="dia" value={dia} />

      <AreaTexto
        id="actividad"
        etiqueta={p.actividad.etiqueta}
        placeholder={p.actividad.ejemplo}
        defaultValue={actividad ?? ''}
        rows={2}
        maxLength={500}
        errores={estado.errores?.actividad}
      />

      {modalidad === 'escolar' && (
        <Campo
          id="materias"
          etiqueta="Materias especiales del día"
          placeholder="Euritmia, Alemán, Tejido"
          ayuda="Separadas por comas."
          defaultValue={materias.join(', ')}
          errores={estado.errores?.materias}
        />
      )}

      <Campo
        id="alimento"
        etiqueta="Colación o cereal"
        placeholder={alimentoMinuta ?? 'Arroz, avena, pan amasado...'}
        ayuda={
          alimentoMinuta
            ? `Si lo dejas en blanco, se muestra el de la minuta: ${alimentoMinuta}.`
            : undefined
        }
        defaultValue={alimento ?? ''}
        maxLength={200}
        errores={estado.errores?.alimento}
      />

      <AreaTexto
        id="nota"
        etiqueta={p.nota.etiqueta}
        placeholder={p.nota.ejemplo}
        defaultValue={nota ?? ''}
        rows={2}
        maxLength={1000}
        errores={estado.errores?.nota}
      />

      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}

      <BotonEnvio esperando="Guardando...">Guardar el día</BotonEnvio>
    </form>
  )
}
