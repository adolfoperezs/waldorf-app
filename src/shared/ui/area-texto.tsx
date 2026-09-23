import { cn } from '@/shared/lib/utils'

type Props = Omit<React.ComponentProps<'textarea'>, 'id'> & {
  id: string
  etiqueta: string
  ayuda?: string
  errores?: string[]
}

/** Texto de varias lineas, con etiqueta, ayuda y error atados por aria como en Campo. */
export function AreaTexto({ id, etiqueta, ayuda, errores, className, ...props }: Props) {
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

      <textarea
        id={id}
        name={props.name ?? id}
        rows={3}
        aria-invalid={errores?.length ? true : undefined}
        aria-describedby={descrito}
        className={cn(
          'w-full rounded-suave border bg-superficie px-3 py-2.5 text-base',
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
