'use client'

import { Plus, X } from 'lucide-react'
import { useActionState, useRef, useState } from 'react'
import { estadoInicial } from '@/shared/lib/formulario'
import { Boton } from '@/shared/ui/boton'
import { Campo } from '@/shared/ui/campo'
import { CopiarParaWhatsapp } from '@/shared/ui/copiar-para-whatsapp'
import { useEnvioConservando } from '@/shared/ui/envio-conservando'
import { Seleccion } from '@/shared/ui/seleccion'
import type { EstadoFamilia } from '../actions/familias'

type Accion = (previo: EstadoFamilia, formData: FormData) => Promise<EstadoFamilia>

type Grupo = { id: string; nombre: string }

/**
 * "+ Sumar familia" (lineamiento, 3.3). Los padres, los ninos con su grupo y,
 * en el mismo acto, un hermano o hermana mas.
 *
 * Al terminar NO se cierra el panel: muestra el mensaje de bienvenida con el
 * enlace, que no se vuelve a mostrar nunca (la base solo guarda su huella).
 */
export function FormularioSumarFamilia({
  accion,
  grupos,
}: {
  accion: Accion
  grupos: Grupo[]
}) {
  const [estado, enviar] = useActionState(accion, estadoInicial as EstadoFamilia)
  const { alEnviar, enVuelo } = useEnvioConservando(enviar)
  // Claves estables por fila: al quitar un hermano del medio, React no debe
  // mover lo escrito de una fila a otra.
  const siguiente = useRef(1)
  const [filas, setFilas] = useState<number[]>([0])

  if (estado.ok && estado.texto) {
    return (
      <div role="status" className="space-y-4">
        <p className="font-titulo text-lg text-primario-oscuro">Familia sumada.</p>
        <p className="text-sm text-texto-suave">
          Manda ahora el mensaje de bienvenida: por seguridad, el enlace no se
          vuelve a mostrar. Si se pierde, crea otro desde la tarjeta de la familia.
        </p>
        <CopiarParaWhatsapp texto={estado.texto} />
      </div>
    )
  }

  const e = estado.errores ?? {}

  return (
    <form action={enviar} onSubmit={alEnviar} className="space-y-6">
      <Campo
        id="nombre"
        etiqueta="Familia"
        placeholder="Camila Soto y Rodrigo Pérez"
        ayuda="Los nombres de los padres, o como conoce la escuela a esta familia."
        required
        errores={e.nombre}
      />

      <Campo
        id="correo"
        etiqueta="Correo de quien recibe el enlace (opcional)"
        type="email"
        autoComplete="off"
        ayuda="Si lo pones, solo esa persona podrá usar el enlace."
        errores={e.correo}
      />

      <div className="space-y-4">
        {filas.map((fila, i) => (
          <fieldset
            key={fila}
            className="relative space-y-4 rounded-organico border border-borde bg-lienzo p-4"
          >
            <legend className="float-left font-titulo text-base text-primario-oscuro">
              {i === 0 ? 'Niño o niña' : 'Hermano o hermana'}
            </legend>
            {filas.length > 1 && (
              <button
                type="button"
                onClick={() => setFilas((actuales) => actuales.filter((f) => f !== fila))}
                className="absolute top-1.5 right-1.5 inline-flex size-11 items-center justify-center rounded-suave text-texto-suave hover:bg-crema-100"
                aria-label={`Quitar ${i === 0 ? 'este niño o niña' : 'este hermano o hermana'}`}
              >
                <X aria-hidden className="size-4" />
              </button>
            )}

            <div className="clear-both grid gap-4 pt-2 sm:grid-cols-2">
              <Campo
                id={`ninos.${i}.nombre`}
                etiqueta="Nombre"
                required
                errores={e[`ninos.${i}.nombre`]}
              />
              <Campo
                id={`ninos.${i}.apellidos`}
                etiqueta="Apellidos"
                required
                errores={e[`ninos.${i}.apellidos`]}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo
                id={`ninos.${i}.fechaNacimiento`}
                etiqueta="Fecha de nacimiento"
                type="date"
                required
                errores={e[`ninos.${i}.fechaNacimiento`]}
              />
              <Seleccion
                id={`ninos.${i}.grupoId`}
                etiqueta="Grupo al que ingresa"
                defaultValue=""
                errores={e[`ninos.${i}.grupoId`]}
              >
                <option value="">Todavía sin grupo</option>
                {grupos.map((grupo) => (
                  <option key={grupo.id} value={grupo.id}>
                    {grupo.nombre}
                  </option>
                ))}
              </Seleccion>
            </div>
          </fieldset>
        ))}

        {filas.length < 8 && (
          <Boton
            type="button"
            variante="fantasma"
            onClick={() => setFilas((actuales) => [...actuales, siguiente.current++])}
          >
            <Plus aria-hidden className="size-4" />
            Añadir hermano o hermana
          </Boton>
        )}
      </div>

      {e.ninos && (
        <p role="alert" className="text-sm text-alerta">
          {e.ninos.join('. ')}
        </p>
      )}

      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}

      <Boton type="submit" disabled={enVuelo}>
        {enVuelo ? 'Sumando...' : 'Sumar familia y crear enlace'}
      </Boton>
    </form>
  )
}
