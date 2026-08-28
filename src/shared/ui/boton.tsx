import { cn } from '@/shared/lib/utils'

type Props = React.ComponentProps<'button'> & {
  variante?: 'primario' | 'suave'
}

/**
 * Boton base. Sin gradientes ni sombras duras (docs/ARCHITECTURE.md).
 *
 * Altura minima de 44px: es el objetivo tactil recomendado, y el usuario
 * tipico esta en un telefono.
 */
export function Boton({ variante = 'primario', className, ...props }: Props) {
  return (
    <button
      className={cn(
        'inline-flex min-h-11 items-center justify-center rounded-suave px-5',
        'text-base transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        variante === 'primario' &&
          'bg-acento text-crema-50 hover:bg-tierra-600',
        variante === 'suave' &&
          'border border-borde bg-superficie text-texto hover:bg-crema-100',
        className,
      )}
      {...props}
    />
  )
}
