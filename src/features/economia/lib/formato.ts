import { formatearDia } from '@/features/ritmo/lib/fechas'

/**
 * Montos y horas para mostrar.
 *
 * La moneda es de la escuela (escuelas.moneda) y el formato del pais: en
 * Chile, "$95.000"; en Alemania, "95,00 €". Nada de CLP escrito a mano: el
 * nucleo no sabe de Chile (CLAUDE.md, regla 5).
 */
type Escuela = { idioma: string; pais: string; moneda: string }

export function formatearDinero(monto: number, escuela: Escuela): string {
  try {
    return new Intl.NumberFormat(`${escuela.idioma}-${escuela.pais}`, {
      style: 'currency',
      currency: escuela.moneda,
    }).format(monto)
  } catch {
    return `${monto} ${escuela.moneda}`
  }
}

export function formatearHoras(horas: number, idioma = 'es'): string {
  const numero = new Intl.NumberFormat(idioma, { maximumFractionDigits: 2 }).format(horas)
  return `${numero} h`
}

/** "Marzo", o "Marzo 2027" si hace falta el anio. */
export function nombreDelMes(periodo: string, idioma = 'es', conAnio = false): string {
  const texto = formatearDia(periodo, idioma, { month: 'long' }, conAnio)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Porcentaje sin decimales, o guion si no hay base. */
export function formatearPorcentaje(fraccion: number | null): string {
  return fraccion === null ? '—' : `${Math.round(fraccion * 100)} %`
}
