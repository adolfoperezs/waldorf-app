import { BookOpen, Sprout } from 'lucide-react'
import { clasesAcento } from '@/shared/design/acentos'
import { cn } from '@/shared/lib/utils'

/** El icono del ciclo: brote para jardin, libro para escolar (lineamiento, 4.3). */
export function IconoCiclo({
  modalidad,
  className,
}: {
  modalidad: string | null | undefined
  className?: string
}) {
  const Icono = modalidad === 'jardin' ? Sprout : BookOpen
  return <Icono aria-hidden className={cn('size-4 shrink-0', className)} />
}

/** Etiqueta pequena con el nombre y el color del ciclo. */
export function ChipCiclo({
  ciclo,
  className,
}: {
  ciclo: { nombre: string; modalidad: string; acento: string } | null
  className?: string
}) {
  if (!ciclo) {
    return (
      <span className={cn('text-xs text-texto-suave', className)}>Sin ciclo</span>
    )
  }

  const acento = clasesAcento(ciclo.acento)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        acento.fondo,
        acento.texto,
        className,
      )}
    >
      <IconoCiclo modalidad={ciclo.modalidad} className="size-3.5" />
      {ciclo.nombre}
    </span>
  )
}
