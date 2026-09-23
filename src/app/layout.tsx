import type { Metadata, Viewport } from 'next'
import { Lora, Plus_Jakarta_Sans } from 'next/font/google'
import { colorTema } from '@/shared/design/waldorf'
import './globals.css'

/**
 * Las dos webfonts del lineamiento: serif calida para titulos y sans limpia
 * para la interfaz. next/font las sirve desde el propio dominio, con subset
 * latino y `swap`: el texto sale enseguida en la fuente del sistema aunque la
 * senal sea mala. Ver la nota de tipografia en globals.css.
 */
const lora = Lora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--fuente-titulo',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--fuente-cuerpo',
})

export const metadata: Metadata = {
  title: 'Gestión Waldorf',
  description: 'Sistema de gestión para escuelas Waldorf',
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
    <html lang="es" className={`${lora.variable} ${jakarta.variable}`}>
      <body>{children}</body>
    </html>
  )
}
