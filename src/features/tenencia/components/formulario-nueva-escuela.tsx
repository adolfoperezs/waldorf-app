'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Boton } from '@/shared/ui/boton'
import { Campo } from '@/shared/ui/campo'
import { crearEscuela } from '../actions/crear-escuela'
import { estadoInicial } from '@/shared/lib/formulario'

function BotonEnviar() {
  const { pending } = useFormStatus()
  return (
    <Boton type="submit" className="w-full" disabled={pending}>
      {pending ? 'Creando...' : 'Crear la escuela'}
    </Boton>
  )
}

/**
 * Alta de escuela. Quien la crea queda como su primer administrador.
 *
 * Los valores por defecto son los de Chile porque la escuela socia de diseno
 * esta en Algarrobo, pero todos son editables: el nucleo tiene que servir a
 * una escuela alemana sin tocar una linea (docs/ARCHITECTURE.md).
 */
export function FormularioNuevaEscuela() {
  const [estado, accion] = useActionState(crearEscuela, estadoInicial)

  return (
    <form action={accion} className="space-y-5">
      <Campo
        id="nombre"
        etiqueta="Nombre de la escuela"
        placeholder="Escuela Waldorf Kimun"
        required
        errores={estado.errores?.nombre}
      />

      <Campo
        id="slug"
        etiqueta="Identificador en la direccion"
        ayuda="Aparece en la URL. Solo minusculas, numeros y guiones."
        placeholder="kimun"
        required
        errores={estado.errores?.slug}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo
          id="pais"
          etiqueta="Pais"
          ayuda="Codigo de dos letras"
          defaultValue="CL"
          maxLength={2}
          required
          errores={estado.errores?.pais}
        />

        <Campo
          id="moneda"
          etiqueta="Moneda"
          ayuda="Codigo de tres letras"
          defaultValue="CLP"
          maxLength={3}
          required
          errores={estado.errores?.moneda}
        />
      </div>

      <Campo
        id="zonaHoraria"
        etiqueta="Zona horaria"
        defaultValue="America/Santiago"
        required
        errores={estado.errores?.zonaHoraria}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label htmlFor="idioma" className="block text-sm text-texto-suave">
            Idioma
          </label>
          <select
            id="idioma"
            name="idioma"
            defaultValue="es"
            className="min-h-11 w-full rounded-suave border border-borde bg-superficie px-3 text-base"
          >
            <option value="es">Espanol</option>
            <option value="de">Aleman</option>
            <option value="en">Ingles</option>
          </select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="hemisferio" className="block text-sm text-texto-suave">
            Hemisferio
          </label>
          <select
            id="hemisferio"
            name="hemisferio"
            defaultValue="sur"
            className="min-h-11 w-full rounded-suave border border-borde bg-superficie px-3 text-base"
          >
            <option value="sur">Sur</option>
            <option value="norte">Norte</option>
          </select>
          <p className="text-sm text-texto-suave">
            Determina el calendario de festividades: San Juan cae en invierno
            en el sur y en verano en el norte.
          </p>
        </div>
      </div>

      {estado.error && (
        <p role="alert" className="text-sm text-alerta">
          {estado.error}
        </p>
      )}

      <BotonEnviar />
    </form>
  )
}
