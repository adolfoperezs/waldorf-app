import { cn } from '@/shared/lib/utils'

type Variante = 'primario' | 'suave' | 'fantasma'

type Props = React.ComponentProps<'button'> & {
  variante?: Variante
}

/** Las clases del boton, para usarlas tambien en un enlace con forma de boton. */
export function clasesBoton(variante: Variante = 'primario', className?: string) {
  return cn(
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-suave px-5',
    'text-base font-medium transition duration-150 ease-out',
    // Microinteraccion: el boton cede un poco al tocarlo.
    'active:scale-[0.98]',
    'disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100',
    variante === 'primario' &&
      'bg-primario text-white shadow-reposo hover:bg-primario-hover',
    variante === 'suave' &&
      'border border-borde bg-superficie text-texto hover:border-tierra-300 hover:bg-crema-100',
    variante === 'fantasma' && 'text-primario hover:bg-crema-100',
    className,
  )
}

/**
 * Boton base. Sin gradientes ni sombras duras (docs/ARCHITECTURE.md).
 *
 * Altura minima de 44px: es el objetivo tactil recomendado, y el usuario
 * tipico esta en un telefono.
 */
export function Boton({ variante = 'primario', className, ...props }: Props) {
  return <button className={clasesBoton(variante, className)} {...props} />
}
