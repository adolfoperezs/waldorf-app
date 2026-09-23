'use client'

import { useState } from 'react'
import { Boton } from '@/shared/ui/boton'

/**
 * Copia al portapapeles un texto ya formateado para pegar en el grupo.
 *
 * No construimos mensajeria: las escuelas viven en WhatsApp y no lo van a
 * dejar. Esto es solo salida (docs/ARCHITECTURE.md).
 */
export function CopiarParaWhatsapp({ texto }: { texto: string }) {
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
    <div className="space-y-2">
      <Boton type="button" variante="suave" onClick={copiar}>
        {copiado ? 'Copiado' : 'Copiar para WhatsApp'}
      </Boton>
      <pre
        aria-label="Texto para pegar en WhatsApp"
        className="max-h-48 overflow-auto whitespace-pre-wrap rounded-suave border border-borde bg-crema-100 p-3 text-sm"
      >
        {texto}
      </pre>
    </div>
  )
}
