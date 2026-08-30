import { cn } from '@/shared/lib/utils'

type Props = Omit<React.ComponentProps<'select'>, 'id'> & {
  id: string
  etiqueta: string
  ayuda?: string
  errores?: string[]
}

/** Select con etiqueta, ayuda y error, atados por aria como en Campo. */
export function Seleccion({
  id,
  etiqueta,
  ayuda,
  errores,
  className,
  children,
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

      <select
        id={id}
        name={props.name ?? id}
        aria-invalid={errores?.length ? true : undefined}
        aria-describedby={descrito}
        className={cn(
          'min-h-11 w-full rounded-suave border bg-superficie px-3 text-base',
          errores?.length ? 'border-alerta' : 'border-borde',
          className,
        )}
        {...props}
      >
        {children}
      </select>

      {errores?.length ? (
        <p id={idError} className="text-sm text-alerta">
          {errores.join('. ')}
        </p>
      ) : null}
    </div>
  )
}
