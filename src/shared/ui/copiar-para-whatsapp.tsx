'use client'

import { Send } from 'lucide-react'
import { useState } from 'react'
import { Boton, clasesBoton } from '@/shared/ui/boton'

/**
 * Un texto ya formateado para WhatsApp: se abre la app con el mensaje escrito
 * o se copia para pegarlo.
 *
 * No construimos mensajeria: las escuelas viven en WhatsApp y no lo van a
 * dejar. Esto es solo salida (docs/ARCHITECTURE.md).
 *
 * `whatsapp://send` y no `https://wa.me/?text=`: el esquema lo resuelve la
 * app instalada en el propio telefono, sin pasar por un servidor web. Con
 * wa.me el texto (que puede llevar un enlace de invitacion o el nombre de un
 * nino) viajaria en la URL de una peticion a un tercero, y docs/PRIVACY.md
 * prohibe datos personales en URLs. Si no hay app instalada, queda copiar.
 */
export function CopiarParaWhatsapp({
  texto,
  enviar = true,
}: {
  texto: string
  /** Mostrar el boton que abre WhatsApp con el mensaje ya escrito. */
  enviar?: boolean
}) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      window.setTimeout(() => setCopiado(false), 2500)
    } catch {
      // Sin portapapeles (http, permisos): el texto se puede seleccionar a mano.
      setCopiado(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {enviar && (
          <a
            href={`whatsapp://send?text=${encodeURIComponent(texto)}`}
            className={clasesBoton('primario')}
          >
            <Send aria-hidden className="size-4" />
            Enviar por WhatsApp
          </a>
        )}
        <Boton type="button" variante="suave" onClick={copiar}>
          {copiado ? 'Copiado' : 'Copiar el texto'}
        </Boton>
      </div>
      <pre
        aria-label="Texto para WhatsApp"
        className="max-h-48 overflow-auto whitespace-pre-wrap rounded-suave border border-borde bg-crema-100 p-3 font-cuerpo text-sm"
      >
        {texto}
      </pre>
    </div>
  )
}
