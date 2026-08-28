import { cn } from '@/shared/lib/utils'

type Props = Omit<React.ComponentProps<'input'>, 'id'> & {
  id: string
  etiqueta: string
  ayuda?: string
  errores?: string[]
}

/**
 * Campo de formulario con etiqueta, ayuda y error.
 *
 * El error se ata al input con aria-describedby y aria-invalid: un lector de
 * pantalla tiene que anunciarlo, no solo verse en rojo. La accesibilidad es
 * prioridad alta en este producto.
 */
export function Campo({
  id,
  etiqueta,
  ayuda,
  errores,
  className,
  ...props
}: Props) {
  const idAyuda = ayuda ? `${id}-ayuda` : undefined
  const idError = errores?.length ? `${id}-error` : undefined
  const descrito = [idAyuda, idError].filter(Boolean).join(' ') || undefined

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm text-texto-suave">
        {etiqueta}
      </label>

      {ayuda && (
        <p id={idAyuda} className="text-sm text-texto-suave">
          {ayuda}
        </p>
      )}

      <input
        id={id}
        name={props.name ?? id}
        aria-invalid={errores?.length ? true : undefined}
        aria-describedby={descrito}
        className={cn(
          'min-h-11 w-full rounded-suave border bg-superficie px-3 text-base',
          'placeholder:text-tierra-300',
          errores?.length ? 'border-alerta' : 'border-borde',
          className,
        )}
        {...props}
      />

      {errores?.length ? (
        <p id={idError} className="text-sm text-alerta">
          {errores.join('. ')}
        </p>
      ) : null}
    </div>
  )
}
