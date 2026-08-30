/** Contexto de escuela que las server actions del ritmo reciben por `bind`. */
export type ContextoEscuela = {
  escuelaId: string
  slug: string
  zonaHoraria: string
}
