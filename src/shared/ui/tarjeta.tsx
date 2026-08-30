import { cn } from '@/shared/lib/utils'

/** Superficie de contenido. Bordes suaves, sin sombras duras ni gradientes. */
export function Tarjeta({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'rounded-organico border border-borde bg-superficie p-5',
        className,
      )}
      {...props}
    />
  )
}
