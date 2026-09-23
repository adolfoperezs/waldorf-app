import { Wheat } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import type { Modalidad } from '@/features/comunidad/queries/comunidad'

/**
 * Un dia del ritmo semanal (lineamiento, 4.3: tarjetas de cereal semanal).
 *
 * Solo `span` por dentro: la maestra la usa como boton para editar el dia, y
 * dentro de un boton solo cabe contenido en linea.
 *
 * Lo que cambia segun el ciclo es el vocabulario, no la estructura: en jardin
 * no hay asignaturas (lineamiento, 3.1), asi que las materias ni se muestran.
 */
export const ETIQUETAS_DIA: Record<Modalidad, { actividad: string; nota: string }> = {
  jardin: { actividad: 'Actividad', nota: 'Para la familia' },
  escolar: { actividad: 'Clase principal', nota: 'Materiales' },
}

export function TarjetaDia({
  nombreDia,
  fecha,
  esHoy,
  alimento,
  actividad,
  materias,
  nota,
  modalidad,
  vacio,
}: {
  nombreDia: string
  fecha: string
  esHoy: boolean
  alimento: string | null
  actividad: string | null
  materias: string[]
  nota: string | null
  modalidad: Modalidad
  /** Texto cuando el dia no tiene nada escrito. Sin el, no se muestra nada. */
  vacio?: string
}) {
  const etiquetas = ETIQUETAS_DIA[modalidad]
  const sinContenido = !actividad && materias.length === 0 && !nota

  return (
    <span
      className={cn(
        'flex h-full flex-col gap-3 rounded-organico border p-4 text-left transition duration-200',
        esHoy
          ? 'border-ocre-500 bg-dia-activo shadow-elevado'
          : 'border-borde bg-superficie shadow-reposo',
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span>
          <span className="block text-xs font-semibold tracking-wide text-texto-suave uppercase">
            {nombreDia}
          </span>
          <span className="block text-sm text-texto-suave">{fecha}</span>
        </span>
        {esHoy && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-ocre-100 px-2 py-0.5 text-xs font-semibold text-ocre-700">
            <span aria-hidden className="size-1.5 animate-latido rounded-full bg-ocre-500" />
            Hoy
          </span>
        )}
      </span>

      {alimento && (
        <span className="flex items-center gap-2 font-titulo text-lg text-primario-oscuro">
          <Wheat aria-hidden className="size-4 shrink-0 text-ocre-500" />
          {alimento}
        </span>
      )}

      {actividad && (
        <span className="block text-sm">
          <span className="block text-xs text-texto-suave">{etiquetas.actividad}</span>
          {actividad}
        </span>
      )}

      {modalidad === 'escolar' && materias.length > 0 && (
        <span className="flex flex-wrap gap-1.5">
          {materias.map((materia) => (
            <span
              key={materia}
              className="rounded-full border border-borde bg-lienzo px-2 py-0.5 text-xs"
            >
              {materia}
            </span>
          ))}
        </span>
      )}

      {nota && (
        <span className="block text-sm text-texto-suave">
          <span className="block text-xs">{etiquetas.nota}</span>
          {nota}
        </span>
      )}

      {sinContenido && vacio && (
        <span className="block text-sm text-texto-suave italic">{vacio}</span>
      )}
    </span>
  )
}
