/**
 * Clases de color por acento de ciclo.
 *
 * Cada ciclo de la escuela elige un acento (columna `ciclos.acento`, con
 * CHECK en la base). El nombre es dato; las clases, no: Tailwind solo genera
 * las utilidades que encuentra escritas enteras en el codigo, asi que no se
 * pueden armar con plantillas de texto como `border-${acento}-500`.
 */
export const ACENTOS = ['salvia', 'ocre', 'arcilla', 'tierra'] as const

export type Acento = (typeof ACENTOS)[number]

export const NOMBRE_ACENTO: Record<Acento, string> = {
  salvia: 'Verde salvia',
  ocre: 'Ocre dorado',
  arcilla: 'Terracota',
  tierra: 'Tierra',
}

type Clases = {
  /** Borde del estado activo. */
  borde: string
  /** Fondo suave, para banners. */
  fondo: string
  /** Texto sobre fondo claro, con contraste suficiente. */
  texto: string
  /** Relleno de puntos y barras de progreso. */
  relleno: string
}

export const CLASES_ACENTO: Record<Acento, Clases> = {
  salvia: {
    borde: 'border-salvia-500',
    fondo: 'bg-salvia-100',
    texto: 'text-salvia-700',
    relleno: 'bg-salvia-500',
  },
  ocre: {
    borde: 'border-ocre-500',
    fondo: 'bg-ocre-100',
    texto: 'text-ocre-700',
    relleno: 'bg-ocre-500',
  },
  arcilla: {
    borde: 'border-arcilla-500',
    fondo: 'bg-arcilla-100',
    texto: 'text-arcilla-700',
    relleno: 'bg-arcilla-500',
  },
  tierra: {
    borde: 'border-tierra-500',
    fondo: 'bg-crema-100',
    texto: 'text-primario-oscuro',
    relleno: 'bg-tierra-500',
  },
}

/** Lo que venga de la base, acotado a un acento conocido. */
export function clasesAcento(acento: string | null | undefined): Clases {
  return CLASES_ACENTO[(ACENTOS as readonly string[]).includes(acento ?? '')
    ? (acento as Acento)
    : 'tierra']
}
