/**
 * Tokens del sistema de diseno Waldorf.
 *
 * Los VALORES viven en el bloque `@theme` de src/app/globals.css, no aqui.
 * Tailwind v4 genera una variable CSS por token, y este archivo se limita a
 * referenciarlas de forma tipada para el JS que las necesite: un estilo en
 * linea, un canvas, un color de grafico, un `<meta name="theme-color">`.
 *
 * Duplicar los hex aqui crearia dos fuentes de verdad que se desincronizan a
 * la primera. Si hace falta un token nuevo, se agrega en globals.css y se
 * referencia desde aqui.
 */

/** Referencia a una variable CSS del tema. */
const v = (nombre: string) => `var(--color-${nombre})`

export const colores = {
  // Fondos: es papel, no pantalla.
  lienzo: v('lienzo'),
  superficie: v('superficie'),
  borde: v('borde'),

  // Texto
  texto: v('texto'),
  textoSuave: v('texto-suave'),

  // Identidad: madera y tierra
  primario: v('primario'),
  primarioOscuro: v('primario-oscuro'),
  primarioHover: v('primario-hover'),
  acento: v('acento'),
  diaActivo: v('dia-activo'),

  /**
   * Semanticos. En economia el tono importa: `atencion` es ocre, no rojo.
   * Un acuerdo de aporte por completar no es una deuda vencida, y la interfaz
   * no debe gritarlo. Ver la seccion Tono de waldorf-domain.
   */
  exito: v('exito'),
  atencion: v('atencion'),
  alerta: v('alerta'),
} as const

export const escalas = {
  crema: [50, 100, 200, 300].map((p) => v(`crema-${p}`)),
  tierra: [200, 300, 400, 500, 600, 700, 800, 900].map((p) => v(`tierra-${p}`)),
  salvia: [100, 300, 500, 700].map((p) => v(`salvia-${p}`)),
  arcilla: [100, 300, 500, 700].map((p) => v(`arcilla-${p}`)),
  ocre: [100, 300, 500, 700].map((p) => v(`ocre-${p}`)),
} as const

/**
 * Paleta para graficos y visualizaciones. Ordenada para que series contiguas
 * se distingan tambien en escala de grises y para daltonismo rojo-verde:
 * alterna claro y oscuro en vez de confiar solo en el matiz.
 */
export const paletaGraficos = [
  v('tierra-500'),
  v('salvia-500'),
  v('arcilla-500'),
  v('ocre-500'),
  v('tierra-300'),
  v('salvia-700'),
] as const

/** Color de la barra del navegador en movil. */
export const colorTema = '#faf7f2'

export type Colores = typeof colores
