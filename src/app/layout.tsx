import type { Metadata, Viewport } from 'next'
import { Lora } from 'next/font/google'
import { colorTema } from '@/shared/design/waldorf'
import './globals.css'

/**
 * Unica webfont de la aplicacion, y solo para titulos. El cuerpo va en
 * fuentes del sistema. Ver la nota de tipografia en globals.css.
 */
const lora = Lora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--fuente-titulo',
})

export const metadata: Metadata = {
  title: 'Gestion Waldorf',
  description: 'Sistema de gestion para escuelas Waldorf',
}

export const viewport: Viewport = {
  themeColor: colorTema,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // TODO(i18n): el idioma sale de la escuela, no del navegador. Mientras el
  // modulo i18n no exista, se fija en espanol.
  return (
    <html lang="es" className={lora.variable}>
      <body>{children}</body>
    </html>
  )
}
