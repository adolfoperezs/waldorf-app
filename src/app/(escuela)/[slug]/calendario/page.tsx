import { VistaCalendario } from '@/features/ritmo/components/vista-calendario'
import { cargarEscuela } from '@/features/tenencia/queries/contexto'

/** El calendario de toda la escuela, para todos. La portada de una familia es el ritmo de sus hijos. */
export default async function PaginaCalendario({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const { escuela, esGestor } = await cargarEscuela(slug)
  return <VistaCalendario escuela={escuela} esGestor={esGestor} />
}
