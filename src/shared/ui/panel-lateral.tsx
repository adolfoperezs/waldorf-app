'use client'

import { X } from 'lucide-react'
import { createContext, useContext, useEffect, useId, useRef, useState } from 'react'
import { cn } from '@/shared/lib/utils'
import { clasesBoton } from './boton'

const ContextoPanel = createContext<{ cerrar: () => void } | null>(null)

/**
 * Panel que se desliza desde el borde derecho con un formulario dentro.
 *
 * El lineamiento pide sacar los formularios de la pagina: un formulario fijo
 * y grande hace que todo se sienta planilla (lineamiento, 1.2 y 4.3).
 *
 * Es un `<dialog>` nativo abierto con showModal(): el navegador atrapa el
 * foco, cierra con Escape y vuelve inerte la pagina de atras. El contenido
 * se monta al abrir y se desmonta al cerrar, asi que cada apertura empieza
 * con el formulario limpio.
 *
 * `variante="tarjeta"` convierte en disparador cualquier contenido (una
 * tarjeta de dia, por ejemplo) sin estilos de boton.
 */
export function PanelLateral({
  titulo,
  descripcion,
  disparador,
  variante = 'primario',
  claseDisparador,
  etiquetaDisparador,
  children,
}: {
  titulo: string
  descripcion?: string
  disparador: React.ReactNode
  variante?: 'primario' | 'suave' | 'fantasma' | 'tarjeta'
  claseDisparador?: string
  /** Nombre accesible del disparador cuando su contenido no lo dice solo. */
  etiquetaDisparador?: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [abierto, setAbierto] = useState(false)
  const idTitulo = useId()

  function abrir() {
    setAbierto(true)
    ref.current?.showModal()
  }

  function cerrar() {
    ref.current?.close()
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        aria-haspopup="dialog"
        aria-label={etiquetaDisparador}
        className={
          variante === 'tarjeta'
            ? cn('text-left', claseDisparador)
            : clasesBoton(variante, claseDisparador)
        }
      >
        {disparador}
      </button>

      <dialog
        ref={ref}
        aria-labelledby={idTitulo}
        className="panel-lateral"
        onClose={() => setAbierto(false)}
        // Un toque en el velo, fuera del panel, lo cierra.
        onClick={(e) => {
          if (e.target === e.currentTarget) cerrar()
        }}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-start gap-4 border-b border-borde px-6 py-5">
            <div className="flex-1 space-y-1">
              <h2 id={idTitulo} className="font-titulo text-xl">
                {titulo}
              </h2>
              {descripcion && <p className="text-sm text-texto-suave">{descripcion}</p>}
            </div>
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cerrar"
              className="-mr-2 inline-flex size-11 items-center justify-center rounded-suave text-texto-suave transition hover:bg-crema-100 hover:text-texto"
            >
              <X aria-hidden className="size-5" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            {abierto && (
              <ContextoPanel.Provider value={{ cerrar }}>{children}</ContextoPanel.Provider>
            )}
          </div>
        </div>
      </dialog>
    </>
  )
}

/**
 * Cierra el panel que contiene al formulario cuando la accion sale bien.
 * Fuera de un panel no hace nada, asi que el mismo formulario sirve en los
 * dos sitios.
 */
export function useCerrarAlCompletar(estado: { ok: boolean }) {
  const panel = useContext(ContextoPanel)
  useEffect(() => {
    if (estado.ok) panel?.cerrar()
  }, [estado, panel])
}
