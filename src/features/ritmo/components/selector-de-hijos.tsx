'use client'

import { useId, useRef, useState, useSyncExternalStore } from 'react'
import { IconoCiclo } from '@/features/comunidad/components/chip-ciclo'
import { clasesAcento } from '@/shared/design/acentos'
import { cn } from '@/shared/lib/utils'

export type HijoEnSelector = {
  id: string
  nombre: string
  grupo: string | null
  modalidad: string | null
  acento: string | null
  /** La vista del ritmo de este hijo, ya renderizada en el servidor. */
  panel: React.ReactNode
}

// Lo recordado se lee como un almacen externo (useSyncExternalStore) y no
// con un efecto: en el servidor no hay localStorage, asi que el primer
// dibujo usa el primer hijo y el navegador corrige sin un render de mas.
const EVENTO = 'waldorf:hijo'

function suscribir(avisar: () => void) {
  window.addEventListener('storage', avisar)
  window.addEventListener(EVENTO, avisar)
  return () => {
    window.removeEventListener('storage', avisar)
    window.removeEventListener(EVENTO, avisar)
  }
}

function leer(llave: string): string | null {
  try {
    return window.localStorage.getItem(llave)
  } catch {
    return null // Navegacion privada o almacenamiento bloqueado.
  }
}

/**
 * Selector de hijos (lineamiento, 3.1 y 4.3).
 *
 * Con un solo hijo no hay selector: carga directa. Con varios, pastillas en la
 * cabecera con el color y el icono de su ciclo. Todas las vistas llegan ya
 * renderizadas y el cambio es instantaneo, sin volver al servidor: en un
 * telefono con mala senal, esperar para cambiar de hijo se siente roto.
 *
 * El ultimo hijo elegido se recuerda en este navegador. Es comodidad, no
 * dato: si el almacenamiento falla, se muestra el primero.
 */
export function SelectorDeHijos({
  hijos,
  clave,
}: {
  hijos: HijoEnSelector[]
  /** Distingue lo recordado por escuela. */
  clave: string
}) {
  const base = useId()
  const pestanas = useRef<(HTMLButtonElement | null)[]>([])
  const llave = `waldorf:hijo:${clave}`

  const recordado = useSyncExternalStore(
    suscribir,
    () => leer(llave),
    () => null,
  )
  const [elegido, setElegido] = useState<string | null>(null)

  const existe = (id: string | null) => id !== null && hijos.some((h) => h.id === id)
  const activo = existe(elegido) ? elegido : existe(recordado) ? recordado : hijos[0]?.id

  function elegir(id: string) {
    setElegido(id)
    try {
      window.localStorage.setItem(llave, id)
      window.dispatchEvent(new Event(EVENTO))
    } catch {
      // Sin almacenamiento, el cambio igual funciona en esta visita.
    }
  }

  // Flechas izquierda y derecha, como en cualquier grupo de pestanas.
  function alTeclado(evento: React.KeyboardEvent, indice: number) {
    const paso = evento.key === 'ArrowRight' ? 1 : evento.key === 'ArrowLeft' ? -1 : 0
    if (!paso) return
    evento.preventDefault()
    const siguiente = (indice + paso + hijos.length) % hijos.length
    elegir(hijos[siguiente].id)
    pestanas.current[siguiente]?.focus()
  }

  if (hijos.length === 1) return <>{hijos[0].panel}</>

  return (
    <div className="space-y-6">
      <div
        role="tablist"
        aria-label="Seleccionar alumno"
        className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-1"
      >
        {hijos.map((hijo, i) => {
          const seleccionado = hijo.id === activo
          const acento = clasesAcento(hijo.acento)
          return (
            <button
              key={hijo.id}
              ref={(el) => {
                pestanas.current[i] = el
              }}
              type="button"
              role="tab"
              id={`${base}-pestana-${i}`}
              aria-selected={seleccionado}
              aria-controls={`${base}-panel-${i}`}
              tabIndex={seleccionado ? 0 : -1}
              onClick={() => elegir(hijo.id)}
              onKeyDown={(e) => alTeclado(e, i)}
              className={cn(
                'inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 px-4 text-sm transition duration-200',
                seleccionado
                  ? cn('bg-superficie font-semibold text-texto shadow-elevado', acento.borde)
                  : 'border-borde bg-transparent text-texto-suave hover:bg-superficie',
              )}
            >
              <IconoCiclo
                modalidad={hijo.modalidad}
                className={seleccionado ? acento.texto : undefined}
              />
              {hijo.nombre}
              {hijo.grupo && (
                <span className={cn('font-normal', seleccionado ? 'text-texto-suave' : '')}>
                  · {hijo.grupo}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {hijos.map((hijo, i) => (
        <div
          key={hijo.id}
          role="tabpanel"
          id={`${base}-panel-${i}`}
          aria-labelledby={`${base}-pestana-${i}`}
          hidden={hijo.id !== activo}
        >
          {hijo.panel}
        </div>
      ))}
    </div>
  )
}
