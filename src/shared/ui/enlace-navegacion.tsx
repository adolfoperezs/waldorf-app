'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/shared/lib/utils'

/**
 * Enlace de la navegacion principal que sabe si es la seccion actual.
 * `exacto` para la portada, que si no quedaria activa en todas las rutas.
 */
export function EnlaceNavegacion({
  href,
  exacto = false,
  children,
}: {
  href: string
  exacto?: boolean
  children: React.ReactNode
}) {
  const ruta = usePathname()
  const activo = exacto ? ruta === href : ruta === href || ruta.startsWith(`${href}/`)

  return (
    <Link
      href={href}
      aria-current={activo ? 'page' : undefined}
      className={cn(
        'inline-flex min-h-11 items-center border-b-2 text-sm transition-colors',
        activo
          ? 'border-primario font-semibold text-primario-oscuro'
          : 'border-transparent text-texto-suave hover:text-texto',
      )}
    >
      {children}
    </Link>
  )
}
