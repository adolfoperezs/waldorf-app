'use client'

import { useEffect, useRef } from 'react'

/**
 * La semana en una tira: desplazable de lado en el telefono, en columnas en
 * pantallas anchas (lineamiento, 4.3).
 *
 * Al abrir, la tira se corre hasta hoy. Se toca `scrollLeft` y no
 * scrollIntoView, que tambien moveria la pagina en vertical.
 */
export function TiraDeDias({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLOListElement>(null)

  useEffect(() => {
    const tira = ref.current
    const hoy = tira?.querySelector<HTMLElement>('[aria-current="date"]')
    if (tira && hoy && tira.scrollWidth > tira.clientWidth) {
      tira.scrollLeft = hoy.offsetLeft - tira.offsetLeft - 24
    }
  }, [])

  return (
    <ol
      ref={ref}
      className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-2 md:mx-0 md:grid md:grid-cols-5 md:overflow-visible md:px-0"
    >
      {children}
    </ol>
  )
}

/** Un elemento de la tira. `esHoy` lo marca para lectores de pantalla y para el desplazamiento. */
export function DiaDeLaTira({
  esHoy,
  children,
}: {
  esHoy: boolean
  children: React.ReactNode
}) {
  return (
    <li
      aria-current={esHoy ? 'date' : undefined}
      className="w-[78%] shrink-0 snap-start sm:w-[45%] md:w-auto"
    >
      {children}
    </li>
  )
}
